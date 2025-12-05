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
  imageSettings?: { imagesCount: number; imagesSource: 'unsplash' | 'ai' | 'none' }
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
      console.log(`[TelegramSimple] 🖼️ Generating ${imageSettings.imagesCount} images from ${imageSettings.imagesSource}...`);
      
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
      url_en: `https://app.icoffio.com/en/article/${slug}-en`,
      
      // Polish content (with title prepended as # heading and images if requested)
      slug_pl: `${slug}-pl`,
      content_pl: contentPlWithTitle,
      excerpt_pl: polish.excerpt,
      url_pl: `https://app.icoffio.com/pl/article/${slug}-pl`,
      
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

    return {
      success: true,
      en: {
        id: data.id,
        slug: data.slug_en,
        url: data.url_en || `https://app.icoffio.com/en/article/${data.slug_en}`,
      },
      pl: {
        id: data.id, // Same ID, different slug
        slug: data.slug_pl,
        url: data.url_pl || `https://app.icoffio.com/pl/article/${data.slug_pl}`,
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
