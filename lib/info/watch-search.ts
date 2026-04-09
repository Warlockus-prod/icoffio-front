import { getPool } from '@/lib/pg-pool';

// Source reliability weights: higher = more trustworthy (0-10 scale)
const SOURCE_WEIGHTS: Record<string, number> = {
  // Tier 1: Major industry publications
  'reuters.com': 10, 'bloomberg.com': 10, 'wsj.com': 10, 'ft.com': 10,
  'adweek.com': 9, 'adage.com': 9, 'digiday.com': 9, 'exchangewire.com': 9,
  'adexchanger.com': 9, 'mediapost.com': 8, 'thedrum.com': 8, 'campaignlive.co.uk': 8,
  // Tier 2: Tech/business press
  'techcrunch.com': 8, 'venturebeat.com': 8, 'wired.com': 8, 'theverge.com': 7,
  'businessinsider.com': 7, 'forbes.com': 7, 'cnbc.com': 8,
  // Tier 3: Industry-specific
  'martechseries.com': 7, 'martech.org': 7, 'emarketer.com': 8, 'iab.com': 9,
  'iab.net': 9, 'iabeurope.eu': 9, 'iab.org.pl': 8,
  'wirtualnemedia.pl': 7, 'press.pl': 6, 'brief.pl': 6,
  // Tier 4: Company blogs, PR
  'prnewswire.com': 5, 'businesswire.com': 5, 'globenewswire.com': 5,
  'medium.com': 4, 'linkedin.com': 4,
};

function getSourceWeight(sourceName: string | null): number {
  if (!sourceName) return 5;
  const name = sourceName.toLowerCase().replace('www.', '');
  // Exact match
  if (SOURCE_WEIGHTS[name]) return SOURCE_WEIGHTS[name];
  // Partial match (e.g., "Digiday" matches "digiday.com")
  for (const [domain, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (domain.startsWith(name) || name.includes(domain.split('.')[0])) return weight;
  }
  return 5; // Default weight
}

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
 * Parse HTML website to extract article links
 */
function parseWebsiteLinks(html: string, baseUrl: string): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = [];
  const seen = new Set<string>();
  const base = new URL(baseUrl);

  // Extract links from common article patterns: <a href="..."><h2>Title</h2></a>, <article>, etc.
  // Pattern 1: <a href="...">text with enough words</a> inside headings or article tags
  const linkRegex = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    const inner = match[2];

    // Clean HTML from inner text
    const title = cleanHtml(inner);
    if (!title || title.length < 15 || title.length > 300) continue;

    // Resolve relative URLs
    try {
      if (href.startsWith('/')) {
        href = `${base.protocol}//${base.host}${href}`;
      } else if (!href.startsWith('http')) {
        continue;
      }
    } catch {
      continue;
    }

    // Skip common non-article links
    if (href.includes('/tag/') || href.includes('/category/') || href.includes('/author/') ||
        href.includes('/login') || href.includes('/register') || href.includes('#') ||
        href.includes('javascript:') || href.match(/\.(css|js|png|jpg|svg|ico)$/i)) {
      continue;
    }

    // Skip duplicates
    if (seen.has(href)) continue;
    seen.add(href);

    // Detect language
    const hasRussian = title.match(/[а-яА-ЯёЁ]{5,}/);
    const hasPolish = title.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);

    items.push({
      title,
      url: href,
      source_name: base.hostname.replace('www.', ''),
      description: null,
      published_at: null,
      language: hasRussian ? 'ru' : hasPolish ? 'pl' : 'en',
    });
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

  // Fetch from extra_sources (RSS feeds or website URLs)
  const extraSources: string[] = topic.extra_sources || [];
  for (const sourceUrl of extraSources) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InfoWatch/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        console.error(`[Watch] Extra source fetch failed: ${response.status} for ${sourceUrl}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      let parsedItems: GoogleNewsItem[] = [];

      if (contentType.includes('xml') || contentType.includes('rss') || body.trimStart().startsWith('<?xml') || body.includes('<rss') || body.includes('<feed')) {
        // Parse as RSS/Atom
        parsedItems = parseGoogleNewsRss(body, 'en');
        // Try to detect lang from content
        if (body.match(/[а-яА-ЯёЁ]{10,}/)) {
          parsedItems = parsedItems.map(it => ({ ...it, language: 'ru' }));
        }
      } else {
        // Parse as HTML website — extract links and titles
        parsedItems = parseWebsiteLinks(body, sourceUrl);
      }

      const hostname = new URL(sourceUrl).hostname.replace('www.', '');
      for (const item of parsedItems.slice(0, 20)) {
        try {
          await pool.query(
            `INSERT INTO info_watch_items (topic_id, title, url, source_name, description, language, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (topic_id, url) DO UPDATE SET
               title = EXCLUDED.title,
               description = COALESCE(EXCLUDED.description, info_watch_items.description),
               source_name = COALESCE(EXCLUDED.source_name, info_watch_items.source_name)`,
            [topicId, item.title, item.url, item.source_name || hostname, item.description, item.language, item.published_at]
          );
          totalInserted++;
        } catch (err: any) {
          if (!err.message?.includes('duplicate')) {
            console.error(`[Watch] Extra insert error: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`[Watch] Extra source error for ${sourceUrl}: ${err.message}`);
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
 * Generate AI report for a topic using GPT-5.4
 */
export async function generateWatchReport(topicId: number, reportLang: string = 'en', days?: number): Promise<string> {
  const pool = getPool();

  // Get topic info
  const { rows: [topic] } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE id = $1', [topicId]
  );
  if (!topic) throw new Error('Topic not found');

  // Use explicit days param > topic setting > default 30
  const reportDays = days || topic.report_days || 30;

  // Get recent articles
  const { rows: items } = await pool.query(
    `SELECT title, url, source_name, description, language, published_at
     FROM info_watch_items WHERE topic_id = $1
     AND (published_at > NOW() - INTERVAL '1 day' * $2 OR published_at IS NULL)
     ORDER BY published_at DESC NULLS LAST LIMIT 50`,
    [topicId, reportDays]
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

Write the ENTIRE report in ${reportLang === 'ru' ? 'Russian' : reportLang === 'pl' ? 'Polish' : 'English'}. Be specific, data-driven, and cite sources. Translate all article titles and key points into the report language.`;

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
      max_completion_tokens: 4000,
    }),
    signal: AbortSignal.timeout(90000),
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

/**
 * Mark duplicate articles across topics (same title, different sources)
 */
export async function deduplicateItems(): Promise<number> {
  const pool = getPool();
  // Mark items as duplicates if there's an older item with very similar title (>80% overlap)
  // Simple approach: exact title match across topics
  const { rowCount } = await pool.query(`
    UPDATE info_watch_items SET is_duplicate = true
    WHERE id IN (
      SELECT wi2.id
      FROM info_watch_items wi1
      JOIN info_watch_items wi2 ON LOWER(wi1.title) = LOWER(wi2.title) AND wi1.id < wi2.id
      WHERE wi2.is_duplicate = false
    )
  `);
  return rowCount || 0;
}

/**
 * Analyze sentiment for items without it (batch)
 */
export async function analyzeSentiment(batchSize: number = 30): Promise<number> {
  const pool = getPool();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return 0;

  const { rows: items } = await pool.query(
    `SELECT id, title, description FROM info_watch_items
     WHERE sentiment IS NULL AND is_duplicate = false
     ORDER BY published_at DESC NULLS LAST LIMIT $1`,
    [batchSize]
  );

  if (items.length === 0) return 0;

  const titles = items.map((it: any, i: number) => `${i + 1}. ${it.title}`).join('\n');

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Analyze the sentiment of each headline. Return JSON: {"results": [{"n": 1, "s": "positive|negative|neutral", "t": ["tag1","tag2"]}]}. Tags should be from: product_launch, partnership, earnings, hiring, acquisition, regulation, award, controversy, market_trend, research.' },
          { role: 'user', content: titles },
        ],
        temperature: 0.2,
        max_completion_tokens: 2000,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) return 0;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return 0;

    const parsed = JSON.parse(content);
    let updated = 0;

    for (const result of (parsed.results || [])) {
      const idx = (result.n || 0) - 1;
      if (idx < 0 || idx >= items.length) continue;
      const item = items[idx];
      const sentiment = ['positive', 'negative', 'neutral'].includes(result.s) ? result.s : 'neutral';
      const tags = Array.isArray(result.t) ? result.t : [];

      await pool.query(
        'UPDATE info_watch_items SET sentiment = $1, tags = $2 WHERE id = $3',
        [sentiment, tags, item.id]
      );
      updated++;
    }
    return updated;
  } catch (err: any) {
    console.error('[Watch Sentiment]', err.message);
    return 0;
  }
}

/**
 * Calculate quality score for each topic based on article freshness & volume
 */
export async function updateQualityScores(): Promise<void> {
  const pool = getPool();
  // Get items with source names for weighting
  const { rows: items } = await pool.query(`
    SELECT topic_id, source_name, published_at
    FROM info_watch_items WHERE is_duplicate = false
  `);

  // Calculate weighted scores per topic
  const topicScores: Record<number, number> = {};
  for (const item of items) {
    const weight = getSourceWeight(item.source_name);
    const pubDate = item.published_at ? new Date(item.published_at).getTime() : 0;
    const now = Date.now();
    const daysSince = pubDate ? (now - pubDate) / 86400000 : 30;

    let freshness = 1;
    if (daysSince < 1) freshness = 10;
    else if (daysSince < 7) freshness = 5;
    else if (daysSince < 14) freshness = 2;

    const score = (weight / 10) * freshness;
    topicScores[item.topic_id] = (topicScores[item.topic_id] || 0) + score;
  }

  for (const [topicId, rawScore] of Object.entries(topicScores)) {
    const normalized = Math.min(100, Math.round(rawScore));
    await pool.query('UPDATE info_watch_topics SET quality_score = $1 WHERE id = $2', [normalized, topicId]);
  }
}

/** Get source weight for external use */
export { getSourceWeight };
