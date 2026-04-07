import { NextRequest, NextResponse } from 'next/server';
import { generateWatchReport } from '@/lib/info/watch-search';
import { getPool } from '@/lib/pg-pool';

export async function POST(req: NextRequest) {
  try {
    const { topic_id, lang, all } = await req.json();

    // Generate reports for ALL topics
    if (all) {
      const pool = getPool();
      const { rows: topics } = await pool.query(
        'SELECT id FROM info_watch_topics WHERE is_active = true ORDER BY sort_order'
      );
      const results: { topic_id: number; ok: boolean; error?: string }[] = [];
      for (const t of topics) {
        try {
          await generateWatchReport(t.id, lang || 'ru');
          results.push({ topic_id: t.id, ok: true });
        } catch (err: any) {
          results.push({ topic_id: t.id, ok: false, error: err.message });
        }
      }
      return NextResponse.json({ ok: true, results });
    }

    if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

    const content = await generateWatchReport(topic_id, lang || 'en');
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
