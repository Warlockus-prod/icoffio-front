import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFeeds, fetchAndStoreFeed } from '@/lib/info/feed-fetcher';
import { getPool } from '@/lib/pg-pool';
import { requireInfoAdmin } from '@/lib/info/auth-guard';

// v10.20.5: full parallel fetch pass is ~30s; give headroom.
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Check whether the caller is the VPS cron (presenting INFO_FETCH_SECRET or CRON_SECRET as Bearer).
 * v10.10.1: needed because we added admin-only auth in 10.6.1, then in 10.8.0 replaced Vercel Cron
 * with VPS cron — but forgot to wire fetch-feeds. Feeds stopped updating 2026-04-07.
 */
function isCronRequest(request: NextRequest): boolean {
  const secret = (process.env.INFO_FETCH_SECRET || process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer && bearer === secret) return true;
  const queryToken = (request.nextUrl.searchParams.get('token') || '').trim();
  if (queryToken && queryToken === secret) return true;
  return false;
}

export async function POST(request: NextRequest) {
  // Allow either: admin-authenticated user OR VPS cron with Bearer token.
  if (!isCronRequest(request)) {
    const denied = await requireInfoAdmin(request);
    if (denied) return denied;
  }
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
