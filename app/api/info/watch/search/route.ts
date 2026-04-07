import { NextRequest, NextResponse } from 'next/server';
import { fetchWatchTopicNews, fetchAllWatchTopics } from '@/lib/info/watch-search';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { topic_id } = body;

    if (topic_id) {
      const count = await fetchWatchTopicNews(topic_id);
      return NextResponse.json({ ok: true, inserted: count });
    }

    // Fetch all topics
    const result = await fetchAllWatchTopics();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[Watch Search]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
