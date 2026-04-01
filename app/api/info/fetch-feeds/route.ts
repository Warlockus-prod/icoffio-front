import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFeeds, fetchAndStoreFeed } from '@/lib/info/feed-fetcher';
import { getPool } from '@/lib/pg-pool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const feedId = body.feed_id;

    if (feedId) {
      // Fetch single feed
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id, feed_url, feed_type FROM info_feeds WHERE id = $1',
        [feedId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
      }
      const feed = rows[0];
      if (!feed.feed_url) {
        return NextResponse.json({ error: 'No feed URL configured' }, { status: 400 });
      }
      const count = await fetchAndStoreFeed(feed.id, feed.feed_url, feed.feed_type);
      return NextResponse.json({ ok: true, items_fetched: count });
    }

    // Fetch all feeds
    const result = await fetchAllFeeds();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[API info/fetch-feeds] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
