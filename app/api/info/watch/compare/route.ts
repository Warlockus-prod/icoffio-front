import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const type = searchParams.get('type') || 'competitor';

    // Current period stats
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

    // Previous period for trend calculation
    const { rows: prevRows } = await pool.query(`
      SELECT
        wt.id,
        COUNT(wi.id) as prev_mentions
      FROM info_watch_topics wt
      LEFT JOIN info_watch_items wi ON wi.topic_id = wt.id
        AND wi.is_duplicate = false
        AND wi.published_at > NOW() - INTERVAL '1 day' * $1
        AND wi.published_at <= NOW() - INTERVAL '1 day' * $2
      WHERE wt.is_active = true AND wt.topic_type = $3
      GROUP BY wt.id
    `, [days * 2, days, type]);

    const prevMap: Record<number, number> = {};
    for (const r of prevRows) {
      prevMap[r.id] = parseInt(r.prev_mentions);
    }

    // Enrich with trend data
    const enriched = rows.map(r => {
      const total = parseInt(r.total_mentions);
      const pos = parseInt(r.positive);
      const neg = parseInt(r.negative);
      const prev = prevMap[r.id] || 0;
      const trend = prev > 0 ? Math.round(((total - prev) / prev) * 100) : (total > 0 ? 100 : 0);
      const analyzed = pos + neg + parseInt(r.neutral);
      const sentimentScore = analyzed > 0 ? Math.round(((pos - neg) / analyzed) * 100) : 0;
      return {
        ...r,
        prev_mentions: prev,
        trend_pct: trend,
        sentiment_score: sentimentScore,
      };
    });

    return NextResponse.json({ comparison: enriched, days, type });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
