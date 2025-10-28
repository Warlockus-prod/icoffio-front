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

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Refresh materialized view (optional, can be slow)
    await supabase.rpc('refresh_article_popularity').catch(() => {
      console.warn('[Popular Articles API] Failed to refresh materialized view');
    });

    // Get popular articles
    const { data, error } = await supabase
      .from('article_popularity')
      .select('article_slug, total_views, unique_views, last_viewed, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(limit);

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

