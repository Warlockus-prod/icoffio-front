import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');

    if (!topicId) {
      return NextResponse.json({ error: 'topic_id required' }, { status: 400 });
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const { rows } = await pool.query(
      `SELECT * FROM info_watch_items WHERE topic_id = $1
       ORDER BY published_at DESC NULLS LAST
       LIMIT $2`,
      [topicId, limit]
    );

    return NextResponse.json({ items: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
