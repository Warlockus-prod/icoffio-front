/**
 * POPULAR ARTICLES API
 * 
 * GET /api/analytics/popular-articles?limit=20
 * 
 * Returns most viewed articles with view counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const locale = searchParams.get('locale') || undefined; // Фильтр по языку: en или pl

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Validate locale
    if (locale && !['en', 'pl'].includes(locale)) {
      return NextResponse.json(
        { error: 'Locale must be either "en" or "pl"' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Live path for locale-specific stats (en/pl): uses article_views aggregation via RPC
    // to avoid stale materialized-view reads.
    if (locale) {
      const rpcLimit = Math.min(limit * 4, 100);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_popular_articles', {
        lang: locale,
        article_limit: rpcLimit,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        const rankedRows = rpcData
          .map((row: any) => ({
            article_slug: row?.slug,
            total_views: Number(row?.view_count || 0),
          }))
          .filter((row: any) => typeof row.article_slug === 'string' && row.article_slug.length > 0)
          .slice(0, limit);

        const slugs = rankedRows.map((row: any) => row.article_slug);
        let bySlugMeta = new Map<string, { unique_views: number; last_viewed: string | null }>();

        if (slugs.length > 0) {
          const { data: viewRows, error: viewsError } = await supabase
            .from('article_views')
            .select('article_slug,user_ip,viewed_at')
            .in('article_slug', slugs);

          if (viewsError) {
            console.warn('[Popular Articles API] Failed to fetch live view rows:', viewsError.message);
          } else if (Array.isArray(viewRows)) {
            const agg = new Map<string, { users: Set<string>; last: number }>();

            for (const row of viewRows) {
              const slug = row.article_slug as string;
              if (!slug) continue;

              const current = agg.get(slug) || { users: new Set<string>(), last: 0 };
              if (typeof row.user_ip === 'string' && row.user_ip.length > 0) {
                current.users.add(row.user_ip);
              }

              const viewedAt = row.viewed_at ? new Date(row.viewed_at).getTime() : 0;
              if (Number.isFinite(viewedAt) && viewedAt > current.last) {
                current.last = viewedAt;
              }

              agg.set(slug, current);
            }

            bySlugMeta = new Map(
              Array.from(agg.entries()).map(([slug, value]) => [
                slug,
                {
                  unique_views: value.users.size,
                  last_viewed: value.last > 0 ? new Date(value.last).toISOString() : null,
                },
              ])
            );
          }
        }

        const now = Date.now();
        const articles = rankedRows.map((row: any) => {
          const meta = bySlugMeta.get(row.article_slug);
          const lastViewedTs = meta?.last_viewed ? new Date(meta.last_viewed).getTime() : 0;
          const daysSinceLastView = lastViewedTs > 0 ? (now - lastViewedTs) / 86_400_000 : 365;

          return {
            article_slug: row.article_slug,
            total_views: row.total_views,
            unique_views: meta?.unique_views || 0,
            last_viewed: meta?.last_viewed,
            popularity_score: row.total_views * 0.7 + daysSinceLastView * -0.3,
          };
        });

        const totalViews = articles.reduce((sum, article) => sum + (article.total_views || 0), 0);
        const totalUniqueViews = articles.reduce((sum, article) => sum + (article.unique_views || 0), 0);

        return NextResponse.json({
          success: true,
          articles,
          count: articles.length,
          stats: {
            total_views: totalViews,
            total_unique_views: totalUniqueViews,
            articles_tracked: articles.length,
          },
          limit,
          source: 'live-rpc',
        });
      }
    }

    // Refresh materialized view (optional, can be slow)
    try {
      await supabase.rpc('refresh_article_popularity');
    } catch (err) {
      console.warn('[Popular Articles API] Failed to refresh materialized view:', err);
    }

    // Get popular articles с фильтрацией по языку
    let query = supabase
      .from('article_popularity')
      .select('article_slug, total_views, unique_views, last_viewed, popularity_score')
      .order('popularity_score', { ascending: false });
    
    // Фильтруем по языку если указан (для en и pl)
    if (locale) {
      query = query.like('article_slug', `%-${locale}`);
      console.log(`[Popular Articles API] 🌍 Filtering for locale: ${locale}`);
    }
    
    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('[Popular Articles API] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch popular articles' },
        { status: 500 }
      );
    }

    // Calculate total stats
    const totalViews = data?.reduce((sum, article) => sum + (article.total_views || 0), 0) || 0;
    const totalUniqueViews = data?.reduce((sum, article) => sum + (article.unique_views || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      articles: data || [],
      count: data?.length || 0,
      stats: {
        total_views: totalViews,
        total_unique_views: totalUniqueViews,
        articles_tracked: data?.length || 0,
      },
      limit,
    });

  } catch (error) {
    console.error('[Popular Articles API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch popular articles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
