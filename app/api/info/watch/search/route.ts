import { NextRequest, NextResponse } from 'next/server';
import { fetchWatchTopicNews, fetchAllWatchTopics } from '@/lib/info/watch-search';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

export async function POST(req: NextRequest) {
  const denied = await requireInfoAdmin(req);
  if (denied) return denied;
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
