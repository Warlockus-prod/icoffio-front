/**
 * SUPABASE ARTICLES API v7.14.0
 * 
 * Replaces WordPress GraphQL with direct Supabase queries
 * Provides articles for Next.js frontend
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const featured = searchParams.get('featured') === 'true';

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('published_articles')
      .select('*')
      .eq('published', true);

    // Filter by language (check if content exists for that language)
    if (language === 'en') {
      query = query.not('content_en', 'is', null);
    } else if (language === 'pl') {
      query = query.not('content_pl', 'is', null);
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by featured
    if (featured) {
      query = query.eq('featured', true);
    }

    // Order and limit
    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data: articles, error } = await query;

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // Transform to frontend format
    const transformedArticles = articles.map((article: any) => {
      const isEn = language === 'en';
      const slug = isEn ? article.slug_en : article.slug_pl;
      const content = isEn ? article.content_en : article.content_pl;
      const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;

      return {
        id: article.id.toString(),
        title: article.title,
        slug: slug,
        excerpt: excerpt || '',
        content: content || '',
        date: article.created_at,
        image: article.image_url || '',
        category: {
          name: article.category || 'General',
          slug: (article.category || 'general').toLowerCase()
        },
        tags: article.tags || [],
        author: article.author || 'icoffio Bot',
        language: language,
        wordCount: article.word_count || 0
      };
    });

    return NextResponse.json({
      success: true,
      articles: transformedArticles,
      count: transformedArticles.length,
      message: `Loaded ${transformedArticles.length} articles from Supabase`,
      source: 'supabase'
    });

  } catch (error: any) {
    console.error('Supabase articles API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      articles: [],
      count: 0,
      source: 'supabase'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, slug, language } = body;

    const supabase = getSupabaseClient();

    if (action === 'get-by-slug') {
      // Get specific article by slug
      const { data: article, error } = await supabase
        .from('published_articles')
        .select('*')
        .or(`slug_en.eq.${slug},slug_pl.eq.${slug}`)
        .eq('published', true)
        .single();

      if (error || !article) {
        return NextResponse.json({
          success: false,
          error: 'Article not found',
          article: null
        }, { status: 404 });
      }

      const isEn = language === 'en' || article.slug_en === slug;
      
      // Extract Polish title from tags[0] or from content_pl first heading
      let plTitle = article.title; // Fallback to English
      let plContent = article.content_pl || '';
      
      if (!isEn && article.tags && article.tags.length > 0) {
        plTitle = article.tags[0]; // Polish title stored in tags
      } else if (!isEn && article.content_pl) {
        // Try to extract from first # heading in content_pl
        const headingMatch = article.content_pl.match(/^#\s+(.+)$/m);
        if (headingMatch) {
          plTitle = headingMatch[1];
        }
      }
      
      // Remove first # heading from Polish content (to avoid duplication)
      if (!isEn && plContent) {
        plContent = plContent.replace(/^#\s+.+\n\n?/m, '');
      }
      
      const transformedArticle = {
        id: article.id.toString(),
        title: isEn ? article.title : plTitle,
        slug: isEn ? article.slug_en : article.slug_pl,
        excerpt: isEn ? article.excerpt_en : article.excerpt_pl,
        content: isEn ? article.content_en : plContent,
        date: article.created_at,
        image: article.image_url || '',
        category: {
          name: article.category || 'General',
          slug: (article.category || 'general').toLowerCase()
        },
        tags: article.tags || [],
        author: article.author || 'icoffio Bot',
        language: isEn ? 'en' : 'pl',
        wordCount: article.word_count || 0,
        // Include both language versions for language switcher
        alternateSlug: isEn ? article.slug_pl : article.slug_en
      };

      return NextResponse.json({
        success: true,
        article: transformedArticle
      });
    }

    if (action === 'get-related') {
      // Get related articles by category
      const { category: articleCategory, excludeSlug, language: lang = 'en', limit = 4 } = body;

      const { data: articles, error } = await supabase
        .from('published_articles')
        .select('*')
        .eq('category', articleCategory)
        .eq('published', true)
        .not(lang === 'en' ? 'slug_en' : 'slug_pl', 'eq', excludeSlug)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get related articles: ${error.message}`);
      }

      const transformedArticles = articles.map((article: any) => {
        const isEn = lang === 'en';
        return {
          id: article.id.toString(),
          title: article.title,
          slug: isEn ? article.slug_en : article.slug_pl,
          excerpt: isEn ? article.excerpt_en : article.excerpt_pl,
          image: article.image_url || '',
          category: {
            name: article.category || 'General',
            slug: (article.category || 'general').toLowerCase()
          },
          date: article.created_at
        };
      });

      return NextResponse.json({
        success: true,
        articles: transformedArticles,
        count: transformedArticles.length
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Supabase articles POST error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

