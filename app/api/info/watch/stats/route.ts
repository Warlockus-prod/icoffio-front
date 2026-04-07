import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (topicId) {
      // Daily counts for one topic (sparkline data)
      const { rows } = await pool.query(
        `SELECT DATE(published_at) as day, COUNT(*) as cnt
         FROM info_watch_items
         WHERE topic_id = $1
           AND published_at > NOW() - INTERVAL '1 day' * $2
           AND is_duplicate = false
         GROUP BY DATE(published_at)
         ORDER BY day`,
        [topicId, days]
      );
      return NextResponse.json({ sparkline: rows });
    }

    // Overview stats for all topics
    const { rows: topicStats } = await pool.query(
      `SELECT
         wt.id, wt.name, wt.topic_type,
         COUNT(wi.id) as total_items,
         COUNT(wi.id) FILTER (WHERE wi.published_at > NOW() - INTERVAL '7 days') as week_items,
         COUNT(wi.id) FILTER (WHERE wi.published_at > NOW() - INTERVAL '1 day') as today_items,
         COUNT(wi.id) FILTER (WHERE wi.sentiment = 'positive') as positive,
         COUNT(wi.id) FILTER (WHERE wi.sentiment = 'negative') as negative,
         COUNT(wi.id) FILTER (WHERE wi.sentiment = 'neutral') as neutral
       FROM info_watch_topics wt
       LEFT JOIN info_watch_items wi ON wi.topic_id = wt.id AND wi.is_duplicate = false
       WHERE wt.is_active = true
       GROUP BY wt.id, wt.name, wt.topic_type
       ORDER BY wt.sort_order`,
      []
    );

    return NextResponse.json({ stats: topicStats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
