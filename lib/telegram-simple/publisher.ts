/**
 * TELEGRAM SIMPLE - PUBLISHER
 * 
 * Публикация статей в Supabase
 */

import { createClient } from '@supabase/supabase-js';
import type { ProcessedArticle, PublishResult } from './types';

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
 * Publish article to Supabase
 */
export async function publishArticle(
  article: ProcessedArticle,
  chatId: number
): Promise<PublishResult> {
  console.log(`[TelegramSimple] 📤 Publishing article: "${article.title}"`);

  try {
    const supabase = getSupabase();
    const slug = generateSlug(article.title);
    const now = new Date().toISOString();

    // Prepare article data
    const articleData = {
      // Identity
      chat_id: chatId,
      job_id: `simple_${Date.now()}`,
      
      // Content
      title: article.title,
      slug_en: `${slug}-en`,
      content_en: article.content,
      excerpt_en: article.excerpt,
      
      // Metadata
      category: article.category,
      author: 'Telegram Bot Simple',
      word_count: article.wordCount,
      languages: ['en'],
      
      // Status
      published: true,
      featured: false,
      source: 'telegram-simple',
      
      // Timestamps
      created_at: now,
      
      // URLs (will be generated)
      url_en: `https://app.icoffio.com/en/article/${slug}-en`,
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('published_articles')
      .insert(articleData)
      .select('id, slug_en, url_en')
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from Supabase');
    }

    console.log(`[TelegramSimple] ✅ Published: ID=${data.id}, slug=${data.slug_en}`);

    return {
      success: true,
      id: data.id,
      slug: data.slug_en,
      url: data.url_en || `https://app.icoffio.com/en/article/${data.slug_en}`,
    };

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ Publish error:', error.message);
    
    return {
      success: false,
      id: 0,
      slug: '',
      url: '',
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

