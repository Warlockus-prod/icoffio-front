/**
 * TELEGRAM SIMPLE - URL PARSER v10.3.2
 *
 * Парсинг URL для извлечения контента.
 * - Retry logic (2 attempts with delay) for transient 4xx/5xx errors
 * - Rotating User-Agent to avoid bot detection
 * - OG meta extraction for title/image
 */

import * as cheerio from 'cheerio';
import type { ParsedUrl } from './types';
import { extractSourceImages } from '@/lib/utils/extract-source-images';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const FETCH_TIMEOUT_MS = 20000;

/** Pick a random User-Agent from the pool */
function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** Sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch HTML with retry logic for transient errors.
 * Retries on 4xx/5xx with a different UA and delay.
 */
async function fetchHtmlWithRetry(url: string): Promise<{ html: string; finalUrl: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const ua = attempt === 0 ? USER_AGENTS[0] : randomUA();
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        return { html, finalUrl: response.url || url };
      }

      // Retryable status codes
      const retryable = response.status >= 500 || response.status === 429 || response.status === 403 || response.status === 404;
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (!retryable || attempt >= MAX_RETRIES) {
        throw lastError;
      }

      console.log(`[URLParser] ⚠️ Attempt ${attempt + 1} failed (${response.status}), retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        lastError = new Error(`Timeout after ${FETCH_TIMEOUT_MS}ms`);
      } else if (lastError === null || error !== lastError) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt >= MAX_RETRIES) {
        throw lastError;
      }

      console.log(`[URLParser] ⚠️ Attempt ${attempt + 1} error: ${lastError.message}, retrying...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError || new Error('Failed to fetch URL');
}

/**
 * Parse URL and extract title + content
 */
export async function parseUrl(url: string): Promise<ParsedUrl> {
  console.log(`[URLParser] 🔗 Parsing URL: ${url}`);

  try {
    const { html } = await fetchHtmlWithRetry(url);
    const $ = cheerio.load(html);

    // --- Extract title ---
    let title = '';

    // Try OG title first (most reliable)
    const ogTitle = $('[property="og:title"]').attr('content')?.trim();
    if (ogTitle && ogTitle.length > 10) {
      title = ogTitle;
    }

    if (!title) {
      const titleSelectors = [
        'h1',
        'article h1',
        '.article-title',
        '.post-title',
        '.entry-title',
        '[itemprop="headline"]',
        'title',
      ];

      for (const selector of titleSelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 10) {
          title = text;
          break;
        }
      }
    }

    // --- Extract content paragraphs ---
    const paragraphs: string[] = [];

    const contentSelectors = [
      'article p',
      '.article-content p',
      '.post-content p',
      '.entry-content p',
      '[itemprop="articleBody"] p',
      '[class*="content"] p',
      'main p',
      'p',
    ];

    // Patterns that indicate junk paragraphs (not article content)
    const junkPatterns =
      /\b(subscribe|newsletter|sign\s*up|follow\s+us|cookie|privacy\s+policy|terms\s+of\s+(service|use)|copyright\s*©?|all\s+rights\s+reserved|read\s+more|you\s+might\s+also|related\s+articles|share\s+this|join\s+our|get\s+notified|don'?t\s+miss|stay\s+updated|подписат|подпис|реклам|cookie|конфиденциальност|все\s+права)\b/i;

    let foundContent = false;
    for (const selector of contentSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !junkPatterns.test(text)) {
          paragraphs.push(text);
          foundContent = true;
        }
      });

      if (foundContent && paragraphs.length >= 3) {
        break;
      }
    }

    if (paragraphs.length === 0) {
      throw new Error('No content found on page');
    }

    const content = paragraphs.join('\n\n');

    // Extract images from source page
    const images = extractSourceImages($, url);
    console.log(`[URLParser] ✅ Parsed: "${title}" (${content.length} chars, ${images.length} images)`);

    return {
      title: title || 'Untitled Article',
      content,
      images: images.length > 0 ? images : undefined,
    };
  } catch (error: any) {
    console.error('[URLParser] ❌ Parse error:', error.message);
    throw new Error(`Failed to parse URL: ${error.message}`);
  }
}
