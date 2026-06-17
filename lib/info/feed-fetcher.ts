import { getPool } from '@/lib/pg-pool';
import { assertSafeRemoteUrl } from '@/lib/utils/url-guard';

interface ParsedItem {
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  published_at: string | null;
  guid: string;
}

function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

/**
 * Decode HTML entities (&lt; &gt; &amp; &quot; &#xxx;) then strip all HTML tags.
 * Handles double-encoded content from CDATA sections (Telegram RSSHub, etc.)
 */
function cleanHtml(raw: string): string {
  let s = raw;
  // Decode HTML entities (may be double-encoded, so run twice)
  for (let i = 0; i < 2; i++) {
    s = s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  // Strip all HTML/XML tags
  s = s.replace(/<[^>]+>/g, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * v10.20.9: parse a feed date safely. Returns null for missing/invalid dates and
 * clamps future dates (some feeds emit broken pubDates) to now — keeps sort order sane.
 */
function sanitizePublishedAt(raw: string): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  // tolerate small clock skew (1h), clamp anything further in the future
  return new Date(Math.min(t, now + 3600_000)).toISOString();
}

export function parseRss(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractFromXml(block, 'title');
    const link = extractFromXml(block, 'link') || extractAttr(block, 'link', 'href');
    const desc = extractFromXml(block, 'description');
    const pubDate = extractFromXml(block, 'pubDate') || extractFromXml(block, 'dc:date');
    const guid = extractFromXml(block, 'guid') || link;
    const enclosureUrl = extractAttr(block, 'enclosure', 'url');
    const mediaUrl = extractAttr(block, 'media:content', 'url') || extractAttr(block, 'media:thumbnail', 'url');

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        url: link.trim(),
        description: desc ? cleanHtml(desc).substring(0, 500) : null,
        image_url: enclosureUrl || mediaUrl || null,
        published_at: sanitizePublishedAt(pubDate),
        guid: guid || link,
      });
    }
  }

  return items;
}

export function parseAtom(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractFromXml(block, 'title');
    const link = extractAttr(block, 'link', 'href');
    const summary = extractFromXml(block, 'summary') || extractFromXml(block, 'content');
    const updated = extractFromXml(block, 'updated') || extractFromXml(block, 'published');
    const id = extractFromXml(block, 'id') || link;
    // v10.20.9: Atom feeds also carry images (media:* or <content type="html"> with <img>).
    const atomImage =
      extractAttr(block, 'media:content', 'url') ||
      extractAttr(block, 'media:thumbnail', 'url') ||
      (block.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null);

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        url: link.trim(),
        description: summary ? cleanHtml(summary).substring(0, 500) : null,
        image_url: atomImage,
        published_at: sanitizePublishedAt(updated),
        guid: id || link,
      });
    }
  }

  return items;
}

/**
 * v10.20.1: parse a feed body auto-detecting RSS vs Atom.
 *
 * The DB `feed_type` column is only a HINT — it was frequently wrong (The Verge/
 * Reddit stored as 'rss' but serve Atom; TechMeme/HuggingFace stored as 'atom'
 * but serve RSS). So we parse with the hint first, then fall back to the other
 * format if the primary yields nothing. Pure function — unit-tested.
 */
export function parseFeed(xml: string, feedTypeHint: string): ParsedItem[] {
  const primary = feedTypeHint === 'atom' ? parseAtom(xml) : parseRss(xml);
  if (primary.length > 0) return primary;
  return feedTypeHint === 'atom' ? parseRss(xml) : parseAtom(xml);
}

/** v10.20.9: record a feed-fetch failure so it's visible in the DB / admin UI. */
async function recordFeedFailure(feedId: number, reason: string): Promise<void> {
  try {
    await getPool().query(
      `UPDATE info_feeds
         SET last_attempt_at = NOW(),
             last_error = $2,
             consecutive_failures = consecutive_failures + 1
       WHERE id = $1`,
      [feedId, reason.slice(0, 500)],
    );
  } catch {
    /* never let bookkeeping break the fetch loop */
  }
}

export async function fetchAndStoreFeed(feedId: number, feedUrl: string, feedType: string): Promise<number> {
  const pool = getPool();

  // 🛡️ SSRF guard — feed URLs come from admin DB rows that COULD be edited by less-privileged
  // editor role. Block private IP ranges before any network call.
  const safe = await assertSafeRemoteUrl(feedUrl, { allowHttp: true });
  if (!safe.ok) {
    console.error(`[FeedFetcher] SSRF guard blocked feed ${feedId} (${feedUrl}): ${safe.reason}`);
    await recordFeedFailure(feedId, `SSRF blocked: ${safe.reason}`);
    return 0;
  }

  let response: Response;
  try {
    response = await fetch(feedUrl, {
      // v10.20.0: realistic browser User-Agent. The old 'InfoPortal/1.0' bot UA was
      // blocked (403 / HTML challenge) by Reddit, Cloudflare-fronted sites, etc.
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
      // v10.20.5: 25s (was 15s) — slow feeds like РБК's full.rss timed out at 15s.
      signal: AbortSignal.timeout(25000),
    });
  } catch (err: any) {
    // v10.20.9: catch network/timeout errors here so they're recorded, not swallowed upstream.
    const reason = err?.name === 'TimeoutError' ? 'timeout (25s)' : `network: ${err?.message ?? err}`;
    console.error(`[FeedFetcher] Fetch failed ${feedUrl}: ${reason}`);
    await recordFeedFailure(feedId, reason);
    return 0;
  }

  if (!response.ok) {
    console.error(`[FeedFetcher] Failed to fetch ${feedUrl}: ${response.status}`);
    await recordFeedFailure(feedId, `HTTP ${response.status}`);
    return 0;
  }

  const xml = await response.text();
  const items = parseFeed(xml, feedType);

  if (items.length === 0) {
    // 200 but nothing parseable (HTML challenge page, unexpected format, empty feed)
    await recordFeedFailure(feedId, '0 items parsed (non-feed response?)');
    return 0;
  }

  let inserted = 0;
  for (const item of items.slice(0, 30)) {
    try {
      await pool.query(
        `INSERT INTO info_feed_items (feed_id, title, url, description, image_url, published_at, guid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (feed_id, guid) DO UPDATE SET
           title = EXCLUDED.title,
           -- v10.14.0: if source title changed, invalidate cached translations so the next
           -- translate-batch call picks it up. If unchanged, preserve existing translations.
           title_en = CASE WHEN info_feed_items.title IS DISTINCT FROM EXCLUDED.title THEN NULL ELSE info_feed_items.title_en END,
           title_pl = CASE WHEN info_feed_items.title IS DISTINCT FROM EXCLUDED.title THEN NULL ELSE info_feed_items.title_pl END,
           -- v10.16.0: invalidate cached description translations when source description changes
           description_en = CASE WHEN info_feed_items.description IS DISTINCT FROM EXCLUDED.description THEN NULL ELSE info_feed_items.description_en END,
           description_pl = CASE WHEN info_feed_items.description IS DISTINCT FROM EXCLUDED.description THEN NULL ELSE info_feed_items.description_pl END,
           description = EXCLUDED.description,
           image_url = COALESCE(EXCLUDED.image_url, info_feed_items.image_url),
           published_at = COALESCE(EXCLUDED.published_at, info_feed_items.published_at)`,
        [feedId, item.title, item.url, item.description, item.image_url, item.published_at, item.guid]
      );
      inserted++;
    } catch (err: any) {
      console.error(`[FeedFetcher] Error inserting item: ${err.message}`);
    }
  }

  // Success: clear error state + mark both success and attempt timestamps.
  await pool.query(
    `UPDATE info_feeds
       SET last_fetched_at = NOW(), last_attempt_at = NOW(),
           last_error = NULL, consecutive_failures = 0
     WHERE id = $1`,
    [feedId]
  );

  return inserted;
}

// v10.20.5: process feeds in parallel batches. The old sequential for-loop took
// ~1-3s/feed × 120 feeds = 2-6 min, so the single fetch HTTP request hit its
// timeout before reaching the tail of the queue — feeds with high ids (РБК,
// WirtualneMedia, …) were SYSTEMATICALLY never updated regardless of URL health.
// Batched parallelism brings the full pass to ~30s.
const FETCH_CONCURRENCY = 8;

export async function fetchAllFeeds(): Promise<{ total: number; feeds: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, feed_url, feed_type FROM info_feeds WHERE is_active = true AND feed_url IS NOT NULL'
  );

  let total = 0;
  for (let i = 0; i < rows.length; i += FETCH_CONCURRENCY) {
    const batch = rows.slice(i, i + FETCH_CONCURRENCY);
    const counts = await Promise.all(
      batch.map((feed) =>
        fetchAndStoreFeed(feed.id, feed.feed_url, feed.feed_type).catch((err: any) => {
          console.error(`[FeedFetcher] Feed ${feed.id} error: ${err?.message ?? err}`);
          return 0;
        }),
      ),
    );
    total += counts.reduce((a, b) => a + b, 0);
  }

  return { total, feeds: rows.length };
}
