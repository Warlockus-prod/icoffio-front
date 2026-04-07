import { NextRequest, NextResponse } from 'next/server';
import { generateWatchReport } from '@/lib/info/watch-search';
import { getPool } from '@/lib/pg-pool';

export async function POST(req: NextRequest) {
  try {
    const { topic_id } = await req.json();
    if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

    const content = await generateWatchReport(topic_id);
    return NextResponse.json({ ok: true, report: content });
  } catch (err: any) {
    console.error('[Watch Report]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

    const { rows } = await pool.query(
      'SELECT * FROM info_watch_reports WHERE topic_id = $1 ORDER BY created_at DESC LIMIT $2',
      [topicId, limit]
    );

    return NextResponse.json({ reports: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
