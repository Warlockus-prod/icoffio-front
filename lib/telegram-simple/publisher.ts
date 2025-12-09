/**
 * TELEGRAM SIMPLE - PUBLISHER v8.5.1
 * 
 * Публикация статей в Supabase (EN + PL dual-language)
 * With image generation support
 * ✅ v8.7.5: Full logging integration
 */

import { createClient } from '@supabase/supabase-js';
import type { ProcessedArticle, PublishResult } from './types';
import { translateToPolish } from './translator';
import { insertImages, type ImageGenerationOptions } from './image-generator';
import { generateSlug } from '@/lib/utils/slug-generator';
import { systemLogger } from '@/lib/system-logger';

/**
 * ✅ v8.7.7: Clean markdown from text but keep image markdown
 * Removes all markdown syntax except image syntax ![alt](url)
 */
function cleanMarkdownKeepingImages(content: string): string {
  if (!content) return '';
  
  // Step 1: Temporarily replace image markdown with placeholders
  const imagePlaceholders: string[] = [];
  let placeholderIndex = 0;
  
  const contentWithPlaceholders = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
    imagePlaceholders.push(match);
    return `__IMAGE_PLACEHOLDER_${placeholderIndex++}__`;
  });
  
  // Step 2: Remove ALL markdown syntax from text
  let cleaned = contentWithPlaceholders
    .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/__(.+?)__/g, '$1') // Remove bold (__) - but keep our placeholders
    .replace(/_(.+?)_/g, '$1') // Remove italic (_)
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links (but keep text)
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .replace(/[ \t]+/g, ' ') // Single space
    .trim();
  
  // Step 3: Restore image markdown (before removing __ placeholders)
  placeholderIndex = 0;
  cleaned = cleaned.replace(/__IMAGE_PLACEHOLDER_(\d+)__/g, () => {
    return imagePlaceholders[placeholderIndex++] || '';
  });
  
  // Step 4: Remove any remaining __ placeholders (shouldn't happen, but safety)
  cleaned = cleaned.replace(/__IMAGE_PLACEHOLDER_\d+__/g, '');
  
  return cleaned;
}

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
  const startTime = Date.now();
  
  await systemLogger.info('telegram', 'publish_article', 'Starting article publication', {
    chatId,
    title: article.title,
    autoPublish,
    imagesCount: imageSettings?.imagesCount || 0,
    imagesSource: imageSettings?.imagesSource || 'none',
  });

  try {
    const supabase = getSupabase();
    const slug = generateSlug(article.title);
    const now = new Date().toISOString();

    // Step 1: Translate to Polish
    await systemLogger.info('telegram', 'translate_polish', 'Translating article to Polish', {
      chatId,
      title: article.title,
    });
    
    const translateTimer = systemLogger.startTimer('telegram', 'translate_polish', 'Polish translation');
    const polish = await translateToPolish(article);
    
    // ✅ v8.7.6: Validate Polish title length
    if (polish.title.length > 160) {
      await systemLogger.warn('telegram', 'translate_polish', 'Polish title exceeds 160 characters', {
        titleLength: polish.title.length,
        title: polish.title.substring(0, 100),
      });
    }
    
    await translateTimer.success('Translation completed', {
      polishTitle: polish.title,
      polishTitleLength: polish.title.length,
      polishExcerptLength: polish.excerpt.length,
      polishContentLength: polish.content.length,
    });

    // Step 2: Insert images if requested (v8.5.1)
    let finalContentEn = article.content;
    let finalContentPl = polish.content; // ✅ v8.7.7: Initialize Polish content
    let heroImage: string | null = null; // ✅ FIX: Extract hero image from generated images

    if (imageSettings && imageSettings.imagesCount > 0 && imageSettings.imagesSource !== 'none') {
      await systemLogger.info('telegram', 'image_generation', 'Generating images for article', {
        chatId,
        imagesCount: imageSettings.imagesCount,
        imagesSource: imageSettings.imagesSource,
        title: article.title,
      });
      
      const imageTimer = systemLogger.startTimer('telegram', 'image_generation', 'Image generation');
      
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

      // ✅ v8.7.7: Clean markdown from Polish content AFTER images inserted
      // Keep image markdown (![alt](url)) but remove text markdown
      finalContentPl = cleanMarkdownKeepingImages(finalContentPl);

      // ✅ FIX: Extract first image URL from content as hero image
      const imageUrlMatch = finalContentEn.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
      if (imageUrlMatch && imageUrlMatch[1]) {
        heroImage = imageUrlMatch[1];
        await systemLogger.info('telegram', 'image_generation', 'Hero image extracted', {
          heroImageUrl: heroImage.substring(0, 80),
        });
      } else {
        await systemLogger.warn('telegram', 'image_generation', 'No image URL found in content, using fallback', {
          contentLength: finalContentEn.length,
        });
        // Fallback to category-based Unsplash image
        const categoryImages: Record<string, string> = {
          ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
          apple: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
          tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop',
          games: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&h=630&fit=crop',
        };
        heroImage = categoryImages[article.category] || categoryImages.tech;
      }
      
      await imageTimer.success('Images generated and inserted', {
        imagesCount: imageSettings.imagesCount,
        heroImageSet: !!heroImage,
      });
    } else {
      await systemLogger.info('telegram', 'image_generation', 'No images requested', {
        imagesCount: 0,
        imagesSource: 'none',
      });
      // Use category fallback when no images requested
      const categoryImages: Record<string, string> = {
        ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
        apple: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
        tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop',
        games: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&h=630&fit=crop',
      };
      heroImage = categoryImages[article.category] || categoryImages.tech;
    }

    // Step 3: Prepare article data for BOTH languages
    
    // ✅ v8.7.7: NO markdown in content - title is stored separately
    // Don't prepend title as H1 - it's stored in title_pl field
    const articleData = {
      // Identity
      chat_id: chatId,
      job_id: `simple_${Date.now()}`,
      
      // Main title (English - used by EN articles and as fallback)
      title: article.title,
      
      // ✅ v8.7.7: Store titles separately for both languages
      title_en: article.title,
      title_pl: polish.title,
      
      // English content (with images if requested)
      slug_en: `${slug}-en`,
      content_en: finalContentEn,
      excerpt_en: article.excerpt,
      url_en: `https://app.icoffio.com/en/article/${slug}-en`,
      
      // Polish content (NO title prepended - title is in title_pl field)
      slug_pl: `${slug}-pl`,
      content_pl: finalContentPl, // ✅ v8.7.7: Clean content without markdown title
      excerpt_pl: polish.excerpt,
      url_pl: `https://app.icoffio.com/pl/article/${slug}-pl`,
      
      // Store Polish title in tags for backward compatibility
      tags: [polish.title],
      
      // Metadata
      category: article.category,
      author: 'Telegram Bot Simple',
      word_count: article.wordCount,
      languages: ['en', 'pl'],
      image_url: heroImage, // ✅ FIX: Save hero image URL
      
      // Status (v8.5.0: respects autoPublish setting)
      published: autoPublish,
      featured: false,
      source: 'telegram-simple',
      
      // Timestamps
      created_at: now,
    };

    // Step 4: Insert into Supabase (single row with both languages)
    await systemLogger.info('telegram', 'save_supabase', 'Saving article to Supabase', {
      chatId,
      slug,
      autoPublish,
      hasHeroImage: !!heroImage,
    });
    
    const saveTimer = systemLogger.startTimer('telegram', 'save_supabase', 'Supabase save');
    const { data, error } = await supabase
      .from('published_articles')
      .insert(articleData)
      .select('id, slug_en, slug_pl, url_en, url_pl')
      .single();

    if (error) {
      await saveTimer.error('Supabase save failed', {
        error: error.message,
        code: error.code,
      });
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      await saveTimer.error('No data returned from Supabase', {});
      throw new Error('No data returned from Supabase');
    }

    const duration = Date.now() - startTime;
    await saveTimer.success('Article saved to Supabase', {
      articleId: data.id,
      enSlug: data.slug_en,
      plSlug: data.slug_pl,
      duration_ms: duration,
    });

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
    const duration = Date.now() - startTime;
    await systemLogger.error('telegram', 'publish_article', 'Publication failed', {
      chatId,
      title: article.title,
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    });
    
    return {
      success: false,
      en: { id: 0, slug: '', url: '' },
      pl: { id: 0, slug: '', url: '' },
      error: error.message,
    };
  }
}

// ✅ v8.6.2: generateSlug() теперь импортируется из lib/utils/slug-generator.ts
