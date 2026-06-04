/**
 * Pure display/normalization helpers extracted from components/admin/ArticlesManager.tsx (v10.20.6).
 *
 * These module-level functions drive image classification, slug de-duplication,
 * source grouping and view-count normalization in the admin Articles table.
 * Extracting them shrinks the 1636-line god-component and makes them unit-testable
 * (see __tests__/article-display-helpers.test.ts). Logic byte-for-byte identical.
 */

export const DEFAULT_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';

export const PLACEHOLDER_IMAGE_MARKERS = [
  DEFAULT_IMAGE_MARKER,
  'photo-1518770660439-4636190af475',
  'photo-1518709268805-4e9042af2176',
];

/** True for DALL·E / signed-URL images that expire. */
export const isLikelyTemporaryImage = (image?: string): boolean =>
  Boolean(image && /oaidalleapiprod|[?&](st|se|sp|sig)=/i.test(image));

/** True for known stock placeholder images. */
export const isKnownPlaceholderImage = (image?: string): boolean =>
  Boolean(image && PLACEHOLDER_IMAGE_MARKERS.some((marker) => image.includes(marker)));

/** True only for a real, persistent custom image (not placeholder, not temporary). */
export const hasCustomPersistentImage = (image?: string): boolean =>
  Boolean(image && !isKnownPlaceholderImage(image) && !isLikelyTemporaryImage(image));

/** Empty string for blank/whitespace images, else the trimmed-as-is image. */
export const normalizeArticleImage = (image?: string): string =>
  image && image.trim() ? image : '';

/**
 * Canonical key that collapses an article's EN/PL slug variants into one identity,
 * so the two language rows group together. e.g. `foo-en` and `foo-pl` → `foo::en` / `foo::pl`.
 */
export const getCanonicalSlugKey = (slug: string, language: string): string => {
  const normalized = slug.trim().toLowerCase();
  const match = normalized.match(/^(.*?)-(en|pl)(?:-\d+)?$/);
  if (match) {
    return `${match[1]}::${match[2]}`;
  }
  const lang = language === 'pl' ? 'pl' : 'en';
  return `${normalized.replace(/-\d+$/, '')}::${lang}`;
};

/** Classify an article's source string into a coarse group for filtering/badges. */
export const getSourceGroup = (
  source?: string,
): 'telegram' | 'admin' | 'static' | 'supabase' | 'other' => {
  if (!source) return 'other';
  if (source.startsWith('telegram')) return 'telegram';
  if (source.includes('admin')) return 'admin';
  if (source.includes('static')) return 'static';
  if (
    source.includes('supabase') ||
    source.includes('url-parse') ||
    source.includes('text-generate') ||
    source.includes('api')
  ) {
    return 'supabase';
  }
  return 'other';
};

/** First finite non-negative number among the candidates (number or numeric string), else 0. */
export const normalizeViews = (...values: unknown[]): number => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }
  return 0;
};
