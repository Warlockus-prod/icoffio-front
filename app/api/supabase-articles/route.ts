/**
 * SUPABASE ARTICLES API v7.14.0
 * 
 * Replaces WordPress GraphQL with direct Supabase queries
 * Provides articles for Next.js frontend
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeExcerptText } from '@/lib/utils/content-formatter';

const DEFAULT_THUMBNAIL_MARKER = 'photo-1485827404703-89b55fcc595e';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function hasCustomImage(imageUrl?: string | null): boolean {
  return !!imageUrl && !imageUrl.includes(DEFAULT_THUMBNAIL_MARKER);
}

function articleTimestamp(article: any): number {
  const value = article?.updated_at || article?.created_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function scoreArticle(article: any, language: 'en' | 'pl'): number {
  const content = language === 'pl' ? article?.content_pl : article?.content_en;
  const excerpt = language === 'pl' ? article?.excerpt_pl : article?.excerpt_en;
  const contentLength = typeof content === 'string' ? content.length : 0;

  let score = 0;
  if (hasCustomImage(article?.image_url)) score += 100;
  if (contentLength > 0) score += Math.min(contentLength, 5000) / 50;
  if (typeof excerpt === 'string' && excerpt.trim().length > 0) score += 10;
  if (article?.featured) score += 2;
  return score;
}

function selectBestArticleVersion(articles: any[], language: 'en' | 'pl'): any | null {
  if (!articles || articles.length === 0) return null;

  return articles.reduce((best, candidate) => {
    if (!best) return candidate;

    const bestScore = scoreArticle(best, language);
    const candidateScore = scoreArticle(candidate, language);

    if (candidateScore > bestScore) return candidate;
    if (candidateScore < bestScore) return best;

    return articleTimestamp(candidate) > articleTimestamp(best) ? candidate : best;
  }, null);
}

function dedupeArticlesBySlug(articles: any[], language: 'en' | 'pl'): any[] {
  const groupedBySlug = new Map<string, any[]>();

  for (const article of articles || []) {
    const slugKey = language === 'en' ? article?.slug_en : article?.slug_pl;
    if (!slugKey) continue;

    const existingGroup = groupedBySlug.get(slugKey) || [];
    existingGroup.push(article);
    groupedBySlug.set(slugKey, existingGroup);
  }

  return Array.from(groupedBySlug.values())
    .map(group => selectBestArticleVersion(group, language))
    .filter(Boolean) as any[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const language = searchParams.get('lang') || 'en';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const featured = searchParams.get('featured') === 'true';

    const supabase = getSupabaseClient();

    // Admin list mode: return raw multilingual rows (slug_en + slug_pl).
    if (action === 'get-all') {
      let rawQuery = supabase
        .from('published_articles')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) {
        rawQuery = rawQuery.eq('category', category);
      }

      if (featured) {
        rawQuery = rawQuery.eq('featured', true);
      }

      const { data: rawArticles, error: rawError } = await rawQuery;

      if (rawError) {
        throw new Error(`Supabase query failed: ${rawError.message}`);
      }

      return NextResponse.json({
        success: true,
        articles: rawArticles || [],
        count: (rawArticles || []).length,
        source: 'supabase',
        mode: 'raw'
      });
    }

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

    // ✅ v8.4.1+: Дедупликация по slug с выбором "лучшей" версии записи
    const isEn = language === 'en';
    const uniqueArticles = dedupeArticlesBySlug(articles || [], isEn ? 'en' : 'pl');
    
    console.log(`[supabase-articles] Filtered ${articles.length} -> ${uniqueArticles.length} unique for ${language}`);

    // Transform to frontend format
    const transformedArticles = uniqueArticles.map((article: any) => {
      const slug = isEn ? article.slug_en : article.slug_pl;
      const content = isEn ? article.content_en : article.content_pl;
      const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;

      return {
        id: article.id.toString(),
        title: article.title,
        slug: slug,
        excerpt: sanitizeExcerptText(excerpt || article.title || '', 200),
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
      const { data: articles, error } = await supabase
        .from('published_articles')
        .select('*')
        .or(`slug_en.eq.${slug},slug_pl.eq.${slug}`)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const articleLanguage = slug?.endsWith('-pl') || language === 'pl' ? 'pl' : 'en';
      const article = selectBestArticleVersion(articles || [], articleLanguage);

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
        excerpt: sanitizeExcerptText(isEn ? article.excerpt_en : article.excerpt_pl, 200),
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

      // ✅ v8.4.1: Сначала пробуем найти по категории
      let { data: articles, error } = await supabase
        .from('published_articles')
        .select('*')
        .eq('category', articleCategory)
        .eq('published', true)
        .not(lang === 'en' ? 'slug_en' : 'slug_pl', 'eq', excludeSlug)
        .order('created_at', { ascending: false })
        .limit(limit);

      // ✅ FALLBACK: Если по категории ничего нет - берём последние статьи любой категории
      if (!error && (!articles || articles.length === 0)) {
        console.log(`[get-related] No articles in category "${articleCategory}", falling back to latest`);
        const fallback = await supabase
          .from('published_articles')
          .select('*')
          .eq('published', true)
          .not(lang === 'en' ? 'slug_en' : 'slug_pl', 'eq', excludeSlug)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (fallback.data) {
          articles = fallback.data;
        }
      }

      if (error) {
        throw new Error(`Failed to get related articles: ${error.message}`);
      }

      // ✅ Удаляем дубликаты по slug и выбираем лучшую версию
      const uniqueArticles = dedupeArticlesBySlug(articles || [], lang === 'en' ? 'en' : 'pl');

      const transformedArticles = uniqueArticles.map((article: any) => {
        const isEn = lang === 'en';
        return {
          id: article.id.toString(),
          title: article.title,
          slug: isEn ? article.slug_en : article.slug_pl,
          excerpt: sanitizeExcerptText(isEn ? article.excerpt_en : article.excerpt_pl, 200),
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
