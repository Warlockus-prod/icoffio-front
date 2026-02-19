/**
 * TELEGRAM SIMPLE - PUBLISHER v8.5.1
 * 
 * Публикация статей в Supabase (EN + PL dual-language)
 * With image generation support
 */

import { createClient } from '@supabase/supabase-js';
import type { ProcessedArticle, PublishResult } from './types';
import { translateToPolish } from './translator';
import { insertImages, type ImageGenerationOptions } from './image-generator';
import { buildSiteUrl } from '../site-url';

function normalizeSiteBaseUrl(raw?: string): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isRenderableImageUrl(url: string): boolean {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  if (/\/photo-1(?:[/?]|$)/i.test(normalized)) return false;
  if (/\/(?:undefined|null|nan)(?:[/?]|$)/i.test(normalized)) return false;
  return true;
}

function extractImageUrlsFromContent(content: string): string[] {
  if (!content) return [];

  const found = new Set<string>();
  const markdownRegex = /!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/gim;
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gim;

  let match: RegExpExecArray | null = null;
  while ((match = markdownRegex.exec(content)) !== null) {
    const url = (match[1] || '').trim();
    if (isRenderableImageUrl(url)) found.add(url);
  }

  while ((match = htmlRegex.exec(content)) !== null) {
    const url = (match[1] || '').trim();
    if (isRenderableImageUrl(url)) found.add(url);
  }

  return Array.from(found);
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop',
  security: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1200&auto=format&fit=crop',
  software: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  hardware: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
  internet: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
  gadgets: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
  tech: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?q=80&w=1200&auto=format&fit=crop',
};

function getCategoryFallbackImage(category: string): string {
  return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.tech;
}

const buildArticleUrl = (locale: 'en' | 'pl', slug: string, siteBaseUrl?: string) => {
  const path = `/${locale}/article/${slug}`;
  const base = normalizeSiteBaseUrl(siteBaseUrl);
  if (base) {
    try {
      return new URL(path, `${base}/`).toString();
    } catch {
      // Fall through to default helper
    }
  }
  return buildSiteUrl(path);
};

/**
 * Get Supabase client
 */
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Publish article to Supabase (EN + PL)
 */
export async function publishArticle(
  article: ProcessedArticle,
  chatId: number,
  autoPublish: boolean = true,
  imageSettings?: { imagesCount: number; imagesSource: 'unsplash' | 'ai' | 'none' },
  siteBaseUrl?: string,
  sourceUrl?: string
): Promise<PublishResult> {
  console.log(`[TelegramSimple] 📤 Publishing dual-language: "${article.title}" (autoPublish: ${autoPublish})`);

  try {
    const supabase = getSupabase();
    const slug = generateSlug(article.title);
    const now = new Date().toISOString();

    // Step 1: Translate to Polish
    console.log('[TelegramSimple] 🇵🇱 Translating to Polish...');
    const polish = await translateToPolish(article);

    // Step 2: Insert images if requested (v8.5.1)
    let finalContentEn = article.content;
    let finalContentPl = polish.content;

    if (imageSettings && imageSettings.imagesCount > 0 && imageSettings.imagesSource !== 'none') {
      const effectiveMode =
        imageSettings.imagesCount === 2 ? 'mixed (1 unsplash + 1 ai)' : imageSettings.imagesSource;
      console.log(
        `[TelegramSimple] 🖼️ Generating ${imageSettings.imagesCount} images (effective mode: ${effectiveMode})...`
      );
      
      const imageOptions: ImageGenerationOptions = {
        imagesCount: imageSettings.imagesCount,
        imagesSource: imageSettings.imagesSource,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
      };

      // Insert images into both EN and PL content in parallel
      [finalContentEn, finalContentPl] = await Promise.all([
        insertImages(article.content, imageOptions),
        insertImages(polish.content, imageOptions),
      ]);

      console.log('[TelegramSimple] ✅ Images inserted into content');
    } else {
      console.log('[TelegramSimple] ℹ️ No images requested');
    }

    const extractedImageUrls = extractImageUrlsFromContent(finalContentEn);
    const heroImageUrl = extractedImageUrls[0] || getCategoryFallbackImage(article.category);

    // Step 3: Prepare article data for BOTH languages
    
    // Prepend Polish title as H1 to content (frontend will extract it)
    const contentPlWithTitle = `# ${polish.title}\n\n${finalContentPl}`;
    
    const articleData = {
      // Identity
      chat_id: chatId,
      job_id: `simple_${Date.now()}`,
      
      // Main title (English - used by EN articles and as fallback)
      title: article.title,
      
      // English content (with images if requested)
      slug_en: `${slug}-en`,
      content_en: finalContentEn,
      excerpt_en: article.excerpt,
      url_en: buildArticleUrl('en', `${slug}-en`, siteBaseUrl),
      
      // Polish content (with title prepended as # heading and images if requested)
      slug_pl: `${slug}-pl`,
      content_pl: contentPlWithTitle,
      excerpt_pl: polish.excerpt,
      url_pl: buildArticleUrl('pl', `${slug}-pl`, siteBaseUrl),
      image_url: heroImageUrl || null,
      
      // Store Polish title in tags for easier retrieval
      tags: [polish.title],
      
      // Metadata
      category: article.category,
      author: 'Telegram Bot Simple',
      word_count: article.wordCount,
      languages: ['en', 'pl'],
      
      // Status (v8.5.0: respects autoPublish setting)
      published: autoPublish,
      featured: false,
      source: 'telegram-simple',
      source_url: sourceUrl || null,
      original_input: sourceUrl || article.title,

      // Timestamps
      created_at: now,
    };

    // Step 4: Insert into Supabase (single row with both languages)
    console.log('[TelegramSimple] 💾 Saving to Supabase...');
    const { data, error } = await supabase
      .from('published_articles')
      .insert(articleData)
      .select('id, slug_en, slug_pl, url_en, url_pl')
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from Supabase');
    }

    console.log(`[TelegramSimple] ✅ Published dual-language:`);
    console.log(`  🇬🇧 EN: ID=${data.id}, slug=${data.slug_en}`);
    console.log(`  🇵🇱 PL: slug=${data.slug_pl}`);

    const resolvedEnUrl = buildArticleUrl('en', data.slug_en, siteBaseUrl);
    const resolvedPlUrl = buildArticleUrl('pl', data.slug_pl, siteBaseUrl);

    return {
      success: true,
      en: {
        id: data.id,
        slug: data.slug_en,
        // Avoid stale/legacy DB URL host values; always resolve from current canonical base + slug.
        url: resolvedEnUrl,
      },
      pl: {
        id: data.id, // Same ID, different slug
        slug: data.slug_pl,
        // Avoid stale/legacy DB URL host values; always resolve from current canonical base + slug.
        url: resolvedPlUrl,
      },
    };

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ Publish error:', error.message);
    
    return {
      success: false,
      en: { id: 0, slug: '', url: '' },
      pl: { id: 0, slug: '', url: '' },
      error: error.message,
    };
  }
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace special characters with spaces
    .replace(/[^a-z0-9\s-]/g, ' ')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 60);
}
