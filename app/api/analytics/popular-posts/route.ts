/**
 * POPULAR POSTS API
 *
 * GET /api/analytics/popular-posts?lang=en&limit=12
 *
 * Returns full article cards ordered by analytics popularity score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeExcerptText } from '@/lib/utils/content-formatter';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type ActiveLanguage = 'en' | 'pl';

const MAX_LIMIT = 100;
const RANKING_LOOKUP_MULTIPLIER = 4;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function articleTimestamp(article: any): number {
  const value = article?.updated_at || article?.created_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hasCustomImage(imageUrl?: string | null): boolean {
  const defaultMarker = 'photo-1485827404703-89b55fcc595e';
  return !!imageUrl && !imageUrl.includes(defaultMarker);
}

function scoreArticle(article: any, language: ActiveLanguage): number {
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

function selectBestArticleVersion(articles: any[], language: ActiveLanguage): any | null {
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

function dedupeArticlesBySlug(articles: any[], language: ActiveLanguage): any[] {
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

/**
 * Resolve localized title — for PL extracts Polish title from content H1,
 * tags[0], or excerpt_pl. Falls back to article.title (EN).
 */
function resolveLocalizedTitle(article: any, language: ActiveLanguage): string {
  const baseTitle = sanitizeExcerptText(article?.title || '', 260);

  if (language === 'pl') {
    // 1. H1 heading from content_pl (most reliable — publisher prepends PL title)
    const plContent = article?.content_pl || '';
    const headingMatch = plContent.match(/^\s*#\s+(.+)$/m);
    if (headingMatch && headingMatch[1].trim().length > 10) {
      return sanitizeExcerptText(headingMatch[1].trim(), 260);
    }
    // 2. tags[0] often contains the full Polish title (telegram-simple pipeline)
    const META_TAGS = new Set(['ai-processed', 'imported', 'telegram', 'manual']);
    if (Array.isArray(article.tags) && article.tags.length > 0) {
      const firstTag = article.tags[0];
      if (typeof firstTag === 'string' && firstTag.length > 15 && !META_TAGS.has(firstTag.toLowerCase())) {
        if (firstTag.toLowerCase() !== (baseTitle || '').toLowerCase()) {
          return sanitizeExcerptText(firstTag, 260);
        }
      }
    }
    // 3. excerpt_pl as fallback title
    const excerptPl = (article?.excerpt_pl || '').trim();
    if (excerptPl && excerptPl.length > 10) {
      return sanitizeExcerptText(excerptPl, 200);
    }
  }

  return baseTitle || 'Untitled';
}

function toPost(article: any, language: ActiveLanguage, views: number) {
  const isEn = language === 'en';
  const excerpt = isEn ? article.excerpt_en : article.excerpt_pl;
  const title = resolveLocalizedTitle(article, language);

  return {
    id: String(article.id),
    title,
    slug: isEn ? article.slug_en : article.slug_pl,
    excerpt: sanitizeExcerptText(excerpt || title || '', 200),
    content: isEn ? article.content_en : article.content_pl,
    date: article.created_at,
    publishedAt: article.created_at,
    image: article.image_url || '',
    imageAlt: article.image_url ? title : '',
    category: {
      name: article.category || 'General',
      slug: (article.category || 'general').toLowerCase(),
    },
    tags: article.tags || [],
    author: article.author || 'icoffio Bot',
    language,
    wordCount: article.word_count || 0,
    views,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get('limit') || '12', 10);
    const language = (searchParams.get('lang') || searchParams.get('locale') || 'en') as ActiveLanguage;
    const limit = Number.isFinite(limitRaw) ? limitRaw : 12;

    if (!['en', 'pl'].includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Language must be either "en" or "pl"' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        { success: false, error: `Limit must be between 1 and ${MAX_LIMIT}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Keep ranking fresh but do not fail request on refresh issues.
    try {
      await supabase.rpc('refresh_article_popularity');
    } catch (refreshError) {
      console.warn('[Popular Posts API] Failed to refresh materialized view:', refreshError);
    }

    const rankingLookupLimit = Math.min(limit * RANKING_LOOKUP_MULTIPLIER, MAX_LIMIT);

    // Preferred ranking source: SQL function returns top articles across full base
    // (including zero-view articles ordered by recency).
    let ranking: Array<{ article_slug: string; total_views: number; popularity_score?: number }> = [];
    const rpcResult = await supabase.rpc('get_popular_articles', {
      lang: language,
      article_limit: rankingLookupLimit,
    });

    if (!rpcResult.error && Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
      ranking = rpcResult.data
        .map((row: any) => ({
          article_slug: row?.slug,
          total_views: Number(row?.view_count || 0),
        }))
        .filter((row) => typeof row.article_slug === 'string' && row.article_slug.length > 0);
    } else {
      if (rpcResult.error) {
        console.warn('[Popular Posts API] get_popular_articles RPC unavailable, using materialized view fallback:', rpcResult.error.message);
      }

      const { data: rankingRows, error: rankingError } = await supabase
        .from('article_popularity')
        .select('article_slug,total_views,popularity_score')
        .like('article_slug', `%-${language}`)
        .order('popularity_score', { ascending: false })
        .limit(rankingLookupLimit);

      if (rankingError) {
        throw new Error(`Failed to load popularity ranking: ${rankingError.message}`);
      }

      ranking = (rankingRows || [])
        .map((row: any) => ({
          article_slug: row?.article_slug,
          total_views: Number(row?.total_views || 0),
          popularity_score: Number(row?.popularity_score || 0),
        }))
        .filter((row) => typeof row.article_slug === 'string' && row.article_slug.length > 0);
    }

    if (ranking.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        count: 0,
        source: 'analytics-join',
        stats: {
          tracked_slugs: 0,
          matched_articles: 0,
          language,
        },
      });
    }

    const uniqueSlugs = Array.from(
      new Set(
        ranking
          .map((row: any) => row.article_slug)
          .filter((slug: unknown): slug is string => typeof slug === 'string' && slug.length > 0)
      )
    );

    const slugColumn = language === 'en' ? 'slug_en' : 'slug_pl';
    const contentColumn = language === 'en' ? 'content_en' : 'content_pl';

    const { data: articleRows, error: articleError } = await supabase
      .from('published_articles')
      .select('*')
      .eq('published', true)
      .not(contentColumn, 'is', null)
      .in(slugColumn, uniqueSlugs);

    if (articleError) {
      throw new Error(`Failed to load published articles: ${articleError.message}`);
    }

    const dedupedRows = dedupeArticlesBySlug(articleRows || [], language);
    const articlesBySlug = new Map<string, any>(
      dedupedRows.map((article) => [language === 'en' ? article.slug_en : article.slug_pl, article])
    );
    const viewsBySlug = new Map<string, number>(
      ranking.map((row: any) => [row.article_slug as string, Number(row.total_views || 0)])
    );

    const orderedPosts: any[] = [];
    const seen = new Set<string>();

    for (const row of ranking) {
      const slug = row.article_slug as string;
      if (!slug || seen.has(slug)) continue;

      const article = articlesBySlug.get(slug);
      if (!article) continue;

      orderedPosts.push(toPost(article, language, viewsBySlug.get(slug) || 0));
      seen.add(slug);

      if (orderedPosts.length >= limit) break;
    }

    return NextResponse.json({
      success: true,
      articles: orderedPosts,
      count: orderedPosts.length,
      source: 'analytics-join',
      stats: {
        tracked_slugs: ranking.length,
        matched_articles: dedupedRows.length,
        language,
      },
    });
  } catch (error: any) {
    console.error('[Popular Posts API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
        articles: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
