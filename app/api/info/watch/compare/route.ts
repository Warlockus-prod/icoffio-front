import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const type = searchParams.get('type') || 'competitor';

    const { rows } = await pool.query(`
      SELECT
        wt.id, wt.name, wt.topic_type, wt.quality_score,
        COUNT(wi.id) as total_mentions,
        COUNT(wi.id) FILTER (WHERE wi.sentiment = 'positive') as positive,
        COUNT(wi.id) FILTER (WHERE wi.sentiment = 'negative') as negative,
        COUNT(wi.id) FILTER (WHERE wi.sentiment = 'neutral') as neutral,
        COUNT(wi.id) FILTER (WHERE wi.sentiment IS NULL) as unanalyzed,
        array_agg(DISTINCT unnested_tag) FILTER (WHERE unnested_tag IS NOT NULL) as top_tags,
        MAX(wi.published_at) as latest_article
      FROM info_watch_topics wt
      LEFT JOIN info_watch_items wi ON wi.topic_id = wt.id
        AND wi.is_duplicate = false
        AND wi.published_at > NOW() - INTERVAL '1 day' * $1
      LEFT JOIN LATERAL unnest(wi.tags) as unnested_tag ON true
      WHERE wt.is_active = true AND wt.topic_type = $2
      GROUP BY wt.id, wt.name, wt.topic_type, wt.quality_score
      ORDER BY total_mentions DESC
    `, [days, type]);

    return NextResponse.json({ comparison: rows, days, type });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
