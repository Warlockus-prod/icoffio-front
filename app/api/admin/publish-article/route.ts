/**
 * PUBLISH ARTICLE API v7.14.0
 * 
 * Publishes articles to Supabase (NO WordPress dependency)
 * Used by Telegram bot and admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { systemLogger } from '@/lib/system-logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PublishRequest {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  language: string;
  author?: string;
  tags?: string[];
  image?: string;
  source?: string;
  chatId?: number;
  jobId?: string;
  wordCount?: number;
  processingTime?: number;
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Generate slug from title
function generateSlug(title: string, language: string): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
  
  // Add language suffix
  if (language === 'pl') {
    slug += '-pl';
  } else {
    slug += '-en';
  }
  
  return slug;
}

export async function POST(request: NextRequest) {
  const timer = systemLogger.startTimer('api', 'publish_article', 'Publishing article');
  
  try {
    const body: PublishRequest = await request.json();
    
    const { 
      title, 
      content, 
      excerpt, 
      category, 
      language, 
      author, 
      tags, 
      image, 
      source,
      chatId,
      jobId,
      wordCount,
      processingTime
    } = body;

    // Validate required fields
    if (!title || !content || !excerpt) {
      await systemLogger.warn('api', 'publish_article', 'Missing required fields', { 
        hasTitle: !!title, 
        hasContent: !!content, 
        hasExcerpt: !!excerpt 
      });
      return NextResponse.json(
        { error: 'Missing required fields: title, content, excerpt' },
        { status: 400 }
      );
    }

    console.log(`[Publish] Starting publication: ${title} (${language})`);
    await systemLogger.info('api', 'publish_article', `Starting publication: ${title}`, { 
      language, 
      category, 
      source,
      contentLength: content?.length 
    });

    const supabase = getSupabaseClient();

    // Generate slug
    const slug = generateSlug(title, language);

    // Prepare article data
    const articleData: any = {
      title,
      category: category || 'general',
      image_url: image || null,
      author: author || 'icoffio Bot',
      tags: tags || [],
      word_count: wordCount || Math.round(content.split(/\s+/).length),
      languages: [language],
      source: source || 'api',
      original_input: body.title,
      meta_description: excerpt.substring(0, 160),
      published: true,
      featured: false,
      chat_id: chatId || 0,
      job_id: jobId || null,
      processing_time: processingTime || 0
    };

    // Add language-specific fields
    if (language === 'en') {
      articleData.slug_en = slug;
      articleData.content_en = content;
      articleData.excerpt_en = excerpt;
      articleData.url_en = `https://app.icoffio.com/en/article/${slug}`;
    } else if (language === 'pl') {
      articleData.slug_pl = slug;
      articleData.content_pl = content;
      articleData.excerpt_pl = excerpt;
      articleData.url_pl = `https://app.icoffio.com/pl/article/${slug}`;
    }

    // Insert into Supabase
    const { data: insertedArticle, error: insertError } = await supabase
      .from('published_articles')
      .insert([articleData])
      .select()
      .single();

    if (insertError) {
      console.error('[Publish] Supabase insert error:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to publish to database',
          published: false,
          reason: 'supabase_error',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    console.log(`[Publish] ✅ Article published: ID ${insertedArticle.id}, slug: ${slug}`);

    // Generate frontend URL
    const frontendUrl = 'https://app.icoffio.com';
    const postUrl = `${frontendUrl}/${language}/article/${slug}`;

    // Revalidate Next.js pages
    try {
      await fetch(`${frontendUrl}/api/revalidate?secret=${process.env.REVALIDATE_SECRET || 'secret'}&path=/${language}/article/${slug}`, {
        method: 'POST'
      });
      await fetch(`${frontendUrl}/api/revalidate?secret=${process.env.REVALIDATE_SECRET || 'secret'}&path=/${language}`, {
        method: 'POST'
      });
      console.log(`[Publish] ✅ Revalidated pages for ${slug}`);
    } catch (revalidateError) {
      console.warn('[Publish] ⚠️ Revalidation failed (non-critical):', revalidateError);
    }

    // ✅ Log success
    await timer.success('Article published successfully', {
      articleId: insertedArticle.id,
      title: insertedArticle.title,
      slug,
      language,
      category: category || 'general',
      url: postUrl,
    });

    return NextResponse.json({
      success: true,
      published: true,
      postId: insertedArticle.id,
      url: postUrl,
      slug,
      title: insertedArticle.title,
      category: category || 'general',
      language: language,
      publishedAt: insertedArticle.created_at || new Date().toISOString(),
      message: `Article published successfully to Supabase (ID: ${insertedArticle.id})`
    });

  } catch (error: any) {
    console.error('[Publish] Error:', error);
    
    // ❌ Log error
    await timer.error('Publication failed', {
      errorMessage: error.message,
    }, error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error',
        published: false,
        reason: 'server_error'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    const configured = !!(supabaseUrl && supabaseKey);

    let dbStatus = 'unknown';
    if (configured) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('published_articles')
          .select('id')
          .limit(1);
        
        dbStatus = error ? 'error' : 'connected';
      } catch {
        dbStatus = 'error';
      }
    }

    return NextResponse.json({
      service: 'Article Publisher',
      version: '7.14.0',
      storage: 'Supabase',
      supabase: {
        configured,
        status: dbStatus,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'not configured'
      },
      message: 'WordPress dependency removed. Publishing directly to Supabase.'
    });
  } catch (error: any) {
    return NextResponse.json({
      service: 'Article Publisher',
      version: '7.14.0',
      error: error.message
    }, { status: 500 });
  }
}
