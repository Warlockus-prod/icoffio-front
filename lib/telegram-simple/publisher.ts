/**
 * TELEGRAM SIMPLE - PUBLISHER
 * 
 * Публикация статей в Supabase (EN + PL dual-language)
 */

import { createClient } from '@supabase/supabase-js';
import type { ProcessedArticle, PublishResult } from './types';
import { translateToPolish } from './translator';

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
  chatId: number
): Promise<PublishResult> {
  console.log(`[TelegramSimple] 📤 Publishing dual-language: "${article.title}"`);

  try {
    const supabase = getSupabase();
    const slug = generateSlug(article.title);
    const now = new Date().toISOString();

    // Step 1: Translate to Polish
    console.log('[TelegramSimple] 🇵🇱 Translating to Polish...');
    const polish = await translateToPolish(article);

    // Step 2: Prepare article data for BOTH languages
    const articleData = {
      // Identity
      chat_id: chatId,
      job_id: `simple_${Date.now()}`,
      
      // English content
      title: article.title,
      slug_en: `${slug}-en`,
      content_en: article.content,
      excerpt_en: article.excerpt,
      url_en: `https://app.icoffio.com/en/article/${slug}-en`,
      
      // Polish content
      slug_pl: `${slug}-pl`,
      content_pl: polish.content,
      excerpt_pl: polish.excerpt,
      url_pl: `https://app.icoffio.com/pl/article/${slug}-pl`,
      
      // Metadata
      category: article.category,
      author: 'Telegram Bot Simple',
      word_count: article.wordCount,
      languages: ['en', 'pl'],
      
      // Status
      published: true,
      featured: false,
      source: 'telegram-simple',
      
      // Timestamps
      created_at: now,
    };

    // Step 3: Insert into Supabase (single row with both languages)
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
