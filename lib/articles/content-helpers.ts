/**
 * Pure content/URL/category helpers extracted from app/api/articles/route.ts (v10.20.6).
 *
 * These were inline in the 1574-line route handler. Extracting them here shrinks
 * the god-file and makes the validation logic unit-testable in isolation
 * (see __tests__/article-content-helpers.test.ts). Logic is byte-for-byte identical.
 */

export type SupportedCategory = 'ai' | 'apple' | 'games' | 'tech';

export const SUPPORTED_CATEGORIES = new Set<string>(['ai', 'apple', 'games', 'tech']);

export const DEFAULT_PLACEHOLDER_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';

export const PLACEHOLDER_IMAGE_MARKERS = [
  DEFAULT_PLACEHOLDER_IMAGE_MARKER,
  'photo-1518770660439-4636190af475',
  'photo-1518709268805-4e9042af2176',
];

/** True for DALL·E / signed-URL images that expire (should not be persisted as final). */
export const isLikelyTemporaryImage = (url?: string): boolean =>
  Boolean(url && /oaidalleapiprod|[?&](st|se|sp|sig)=/i.test(url));

/** True for known stock placeholders or expiring temporary images. */
export const isPlaceholderImage = (url?: string): boolean =>
  Boolean(
    url &&
      (PLACEHOLDER_IMAGE_MARKERS.some((marker) => url.includes(marker)) ||
        isLikelyTemporaryImage(url)),
  );

/** Trim text to maxChars, appending a marker when truncated. */
export function truncateText(value: string, maxChars: number): string {
  if (!value) return '';
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}\n\n[truncated]`;
}

/** Normalize an arbitrary category string to a supported one, else fallback. */
export function normalizeCategory(
  input?: string | null,
  fallback: SupportedCategory = 'tech',
): SupportedCategory {
  if (!input) return fallback;
  const normalized = input.toLowerCase().trim();
  if (SUPPORTED_CATEGORIES.has(normalized)) {
    return normalized as SupportedCategory;
  }
  return fallback;
}

/** Dedupe + trim a list of issue strings, dropping empties. */
export function uniqueIssueList(issues: string[]): string[] {
  return Array.from(
    new Set(issues.map((issue) => String(issue || '').trim()).filter(Boolean)),
  );
}

/** True only for well-formed http(s) URLs. */
export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
