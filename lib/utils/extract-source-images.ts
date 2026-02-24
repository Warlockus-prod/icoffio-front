/**
 * EXTRACT SOURCE IMAGES v10.2.0
 *
 * Extracts images from source article HTML using Cheerio.
 * Filters out junk (icons, tracking pixels, ads), resolves relative URLs,
 * scores by relevance, returns top-10 images.
 */

import type { CheerioAPI } from 'cheerio';
import type { ExtractedImage } from '@/lib/telegram-simple/types';

/** Domains known to serve ads, trackers, or social widgets — not article images */
const AD_TRACKER_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'facebook.com/tr',
  'pixel.facebook.com',
  'amazon-adsystem.com',
  'ads.yahoo.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'adnxs.com',
  'moatads.com',
  'scorecardresearch.com',
  'quantserve.com',
  'chartbeat.com',
  'liadm.com',
  'bluekai.com',
];

/** Filename patterns that indicate non-article images */
const JUNK_FILENAME_PATTERN =
  /\b(favicon|icon|logo|sprite|avatar|badge|button|arrow|spacer|pixel|blank|loading|spinner|emoji|social|share|twitter|facebook|linkedin|instagram|pinterest|youtube|tiktok)\b/i;

/**
 * Check if a URL points to an ad/tracker domain.
 */
function isAdTrackerUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return AD_TRACKER_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

/**
 * Resolve a potentially relative image URL to an absolute URL.
 */
function resolveUrl(src: string, baseUrl: string): string | null {
  if (!src || !src.trim()) return null;
  const trimmed = src.trim();

  // Skip tiny data URIs (< 1KB = ~1300 base64 chars → likely a 1px pixel)
  if (trimmed.startsWith('data:')) {
    return trimmed.length > 2000 ? trimmed : null;
  }

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Parse width/height from HTML attributes or inline style.
 */
function parseDimension(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = parseInt(val, 10);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

/**
 * Extract and score images from an HTML page.
 *
 * @param $ - Cheerio root loaded from the source page HTML
 * @param sourceUrl - the original URL (used to resolve relative paths)
 * @returns up to 10 scored, deduplicated images
 */
export function extractSourceImages($: CheerioAPI, sourceUrl: string): ExtractedImage[] {
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];

  function add(
    url: string | undefined | null,
    alt: string | undefined,
    w: number | undefined,
    h: number | undefined,
    context: string,
    baseScore: number
  ) {
    if (!url) return;
    const resolved = resolveUrl(url, sourceUrl);
    if (!resolved) return;

    // Deduplicate
    const key = resolved.split('?')[0]; // ignore query params for dedup
    if (seen.has(key)) return;

    // Filter out ad/tracker domains
    if (isAdTrackerUrl(resolved)) return;

    // Filter out junk filenames
    const filename = resolved.split('/').pop() || '';
    if (JUNK_FILENAME_PATTERN.test(filename)) return;

    // Filter out known tiny tracking pixels by dimension
    if (w && h && (w <= 3 || h <= 3)) return;

    // Filter out very small images (likely icons)
    if (w && w < 100 && h && h < 100) return;

    seen.add(key);

    // Calculate score
    let score = baseScore;
    if (alt && alt.length > 5) score += 10; // has meaningful alt text
    if (w && w >= 600) score += 15; // large width
    if (w && h && w >= 400 && h >= 300) score += 10; // good dimensions

    images.push({ url: resolved, alt: alt || undefined, width: w, height: h, context, score });
  }

  // 1. Open Graph image (highest priority)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    add(ogImage, $('meta[property="og:image:alt"]').attr('content'), undefined, undefined, 'og', 100);
  }

  // 2. Twitter card image
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage && twitterImage !== ogImage) {
    add(twitterImage, $('meta[name="twitter:image:alt"]').attr('content'), undefined, undefined, 'og', 90);
  }

  // 3. Figure images (usually high-quality editorial images)
  $('article figure img, .post-content figure img, main figure img, figure img').each((_, el) => {
    const img = $(el);
    add(
      img.attr('src') || img.attr('data-src'),
      img.attr('alt'),
      parseDimension(img.attr('width')),
      parseDimension(img.attr('height')),
      'figure',
      80
    );
  });

  // 4. Content images
  const contentSelectors = [
    'article img',
    '.article-content img',
    '.post-content img',
    '[class*="content"] img',
    'main img',
  ];

  for (const selector of contentSelectors) {
    $(selector).each((_, el) => {
      const img = $(el);
      add(
        img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src'),
        img.attr('alt'),
        parseDimension(img.attr('width')),
        parseDimension(img.attr('height')),
        'content',
        60
      );
    });
  }

  // 5. Picture > source (responsive images)
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      // Take the largest source from srcset
      const parts = srcset.split(',').map((s) => s.trim());
      const last = parts[parts.length - 1];
      const url = last?.split(/\s+/)[0];
      if (url) {
        add(url, undefined, undefined, undefined, 'content', 50);
      }
    }
  });

  // Sort by score descending, return top 10
  images.sort((a, b) => (b.score || 0) - (a.score || 0));
  return images.slice(0, 10);
}
