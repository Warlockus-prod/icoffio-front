import { getPool } from '@/lib/pg-pool';

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

function parseRss(xml: string): ParsedItem[] {
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
        title: title.replace(/<[^>]+>/g, '').trim(),
        url: link.trim(),
        description: desc ? desc.replace(/<[^>]+>/g, '').substring(0, 500) : null,
        image_url: enclosureUrl || mediaUrl || null,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        guid: guid || link,
      });
    }
  }

  return items;
}

function parseAtom(xml: string): ParsedItem[] {
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

    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        url: link.trim(),
        description: summary ? summary.replace(/<[^>]+>/g, '').substring(0, 500) : null,
        image_url: null,
        published_at: updated ? new Date(updated).toISOString() : null,
        guid: id || link,
      });
    }
  }

  return items;
}

export async function fetchAndStoreFeed(feedId: number, feedUrl: string, feedType: string): Promise<number> {
  const pool = getPool();

  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'InfoPortal/1.0' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error(`[FeedFetcher] Failed to fetch ${feedUrl}: ${response.status}`);
    return 0;
  }

  const xml = await response.text();
  const items = feedType === 'atom' ? parseAtom(xml) : parseRss(xml);

  let inserted = 0;
  for (const item of items.slice(0, 30)) {
    try {
      await pool.query(
        `INSERT INTO info_feed_items (feed_id, title, url, description, image_url, published_at, guid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (feed_id, guid) DO UPDATE SET
           title = EXCLUDED.title,
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

  await pool.query(
    'UPDATE info_feeds SET last_fetched_at = NOW() WHERE id = $1',
    [feedId]
  );

  return inserted;
}

export async function fetchAllFeeds(): Promise<{ total: number; feeds: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, feed_url, feed_type FROM info_feeds WHERE is_active = true AND feed_url IS NOT NULL'
  );

  let total = 0;
  for (const feed of rows) {
    try {
      const count = await fetchAndStoreFeed(feed.id, feed.feed_url, feed.feed_type);
      total += count;
    } catch (err: any) {
      console.error(`[FeedFetcher] Feed ${feed.id} error: ${err.message}`);
    }
  }

  return { total, feeds: rows.length };
}
