import { getPool } from '@/lib/pg-pool';

interface GoogleNewsItem {
  title: string;
  url: string;
  source_name: string | null;
  description: string | null;
  published_at: string | null;
  language: string;
}

function cleanHtml(raw: string): string {
  let s = raw;
  for (let i = 0; i < 2; i++) {
    s = s
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractSource(block: string): string | null {
  const match = block.match(/<source[^>]*url="[^"]*"[^>]*>([^<]+)<\/source>/i);
  return match ? match[1].trim() : null;
}

function parseGoogleNewsRss(xml: string, lang: string): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    let title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractSource(block);

    // Google News titles often end with " - Source Name", clean it
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(` - ${source}`).length).trim();
    }

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        url: link.trim(),
        source_name: source,
        description: desc ? cleanHtml(desc).substring(0, 500) : null,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        language: lang,
      });
    }
  }

  return items;
}

/**
 * Build Google News RSS URL for a keyword + language
 */
function buildGoogleNewsUrl(keyword: string, lang: string): string {
  const q = encodeURIComponent(keyword);
  if (lang === 'ru') {
    return `https://news.google.com/rss/search?q=${q}&hl=ru&gl=RU&ceid=RU:ru`;
  }
  return `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`;
}

/**
 * Fetch Google News RSS for a topic and store items in DB
 */
export async function fetchWatchTopicNews(topicId: number): Promise<number> {
  const pool = getPool();
  const { rows: [topic] } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE id = $1', [topicId]
  );
  if (!topic) return 0;

  const keywords: string[] = topic.keywords || [];
  const langs: string[] = topic.search_langs || ['en'];
  let totalInserted = 0;

  for (const keyword of keywords) {
    for (const lang of langs) {
      try {
        const url = buildGoogleNewsUrl(keyword, lang);
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 InfoWatch/1.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          console.error(`[Watch] Google News fetch failed: ${response.status} for "${keyword}" (${lang})`);
          continue;
        }

        const xml = await response.text();
        const items = parseGoogleNewsRss(xml, lang);

        for (const item of items.slice(0, 30)) {
          try {
            await pool.query(
              `INSERT INTO info_watch_items (topic_id, title, url, source_name, description, language, published_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (topic_id, url) DO UPDATE SET
                 title = EXCLUDED.title,
                 description = COALESCE(EXCLUDED.description, info_watch_items.description),
                 source_name = COALESCE(EXCLUDED.source_name, info_watch_items.source_name)`,
              [topicId, item.title, item.url, item.source_name, item.description, item.language, item.published_at]
            );
            totalInserted++;
          } catch (err: any) {
            if (!err.message?.includes('duplicate')) {
              console.error(`[Watch] Insert error: ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`[Watch] Fetch error for "${keyword}" (${lang}): ${err.message}`);
      }
    }
  }

  // Update timestamp
  await pool.query('UPDATE info_watch_topics SET updated_at = NOW() WHERE id = $1', [topicId]);

  return totalInserted;
}

/**
 * Fetch news for ALL active topics
 */
export async function fetchAllWatchTopics(): Promise<{ total: number; topics: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id FROM info_watch_topics WHERE is_active = true'
  );

  let total = 0;
  for (const row of rows) {
    try {
      const count = await fetchWatchTopicNews(row.id);
      total += count;
    } catch (err: any) {
      console.error(`[Watch] Topic ${row.id} error: ${err.message}`);
    }
  }

  return { total, topics: rows.length };
}

/**
 * Generate AI report for a topic using GPT-4o
 */
export async function generateWatchReport(topicId: number): Promise<string> {
  const pool = getPool();

  // Get topic info
  const { rows: [topic] } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE id = $1', [topicId]
  );
  if (!topic) throw new Error('Topic not found');

  // Get recent articles (last 30 days)
  const { rows: items } = await pool.query(
    `SELECT title, url, source_name, description, language, published_at
     FROM info_watch_items WHERE topic_id = $1
     AND (published_at > NOW() - INTERVAL '30 days' OR published_at IS NULL)
     ORDER BY published_at DESC NULLS LAST LIMIT 50`,
    [topicId]
  );

  if (items.length === 0) {
    return `No recent articles found for "${topic.name}". Try fetching news first.`;
  }

  // Build article list for GPT
  const articleList = items.map((item: any, i: number) => {
    const src = item.source_name ? ` (${item.source_name})` : '';
    const date = item.published_at ? new Date(item.published_at).toLocaleDateString('en-US') : '';
    const desc = item.description ? `\n   ${item.description}` : '';
    return `[${i + 1}] ${item.title}${src} — ${date}${desc}\n   URL: ${item.url}`;
  }).join('\n\n');

  const typeMap: Record<string, string> = {
    competitor: 'competitor/company',
    trend: 'market trend',
    industry: 'industry sector',
  };
  const topicTypeLabel = typeMap[topic.topic_type as string] || 'topic';

  const prompt = `You are a senior market intelligence analyst, similar to Perplexity AI. Analyze the following ${items.length} recent news articles about the ${topicTypeLabel} "${topic.name}" (keywords: ${topic.keywords.join(', ')}).

Provide a comprehensive, actionable market briefing. Use citations [1], [2], etc. to reference specific articles.

ARTICLES:
${articleList}

FORMAT YOUR RESPONSE AS:

## Overview
2-3 sentence executive summary of what's happening with "${topic.name}".

## Key Developments
The most important events and announcements (bullet points with citations).

## Market Trends
Patterns, shifts, and emerging trends you see across these articles.

## Key Players & Moves
Companies mentioned and their recent actions/strategies.

## Outlook & Implications
What this means going forward, potential impacts.

## Sources
List the most important sources referenced.

Write in English. Be specific, data-driven, and cite sources. If articles are in Russian, translate key points.`;

  // Call OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = 'gpt-5.4';

  const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a market intelligence analyst. Provide thorough, well-structured analysis with citations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    throw new Error(`OpenAI API error: ${aiResponse.status} ${err}`);
  }

  const data = await aiResponse.json();
  const reportContent = data.choices?.[0]?.message?.content || 'No analysis generated.';

  // Store report
  await pool.query(
    `INSERT INTO info_watch_reports (topic_id, content, model, sources_count)
     VALUES ($1, $2, $3, $4)`,
    [topicId, reportContent, model, items.length]
  );

  return reportContent;
}

/**
 * Cleanup old watch items (older than N days)
 */
export async function cleanupWatchItems(days: number = 60): Promise<number> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM info_watch_items WHERE fetched_at < NOW() - INTERVAL '1 day' * $1`,
    [days]
  );
  return rowCount || 0;
}
