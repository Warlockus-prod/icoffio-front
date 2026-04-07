import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');
    const search = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Global search across all topics
    if (search && search.length >= 2) {
      const query = `%${search}%`;
      const { rows } = await pool.query(
        `SELECT wi.*, wt.name as topic_name
         FROM info_watch_items wi
         JOIN info_watch_topics wt ON wt.id = wi.topic_id
         WHERE (wi.title ILIKE $1 OR wi.description ILIKE $1 OR wi.source_name ILIKE $1)
           AND wi.is_duplicate = false
         ORDER BY wi.published_at DESC NULLS LAST
         LIMIT $2`,
        [query, limit]
      );
      return NextResponse.json({ items: rows });
    }

    if (!topicId) {
      return NextResponse.json({ error: 'topic_id or q required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT * FROM info_watch_items WHERE topic_id = $1 AND is_duplicate = false
       ORDER BY published_at DESC NULLS LAST
       LIMIT $2`,
      [topicId, limit]
    );

    return NextResponse.json({ items: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
