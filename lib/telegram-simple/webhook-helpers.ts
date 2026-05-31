/**
 * Pure helper functions extracted from the Telegram webhook route (v10.19.0).
 *
 * These were inline in app/api/telegram-simple/webhook/route.ts (2787 lines).
 * Extracting them here:
 *   1. shrinks the route file,
 *   2. makes them unit-testable in isolation (see __tests__/webhook-helpers.test.ts).
 *
 * All functions are PURE (no module state, no side effects) except where noted.
 * Logic is byte-for-byte identical to the originals — this is a refactor, not a behavior change.
 */

import type { NextRequest } from 'next/server';
import type {
  ContentStyle,
  InterfaceLanguage,
  ImagesSource,
} from '@/lib/telegram-simple/types';
import { buildSiteUrl, getSiteBaseUrl } from '@/lib/site-url';

/** Escape the 5 HTML-significant chars for safe Telegram HTML messages. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normalize a URL string to `protocol//host`, or null if invalid / non-http. */
export function normalizeSiteBaseUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/** First non-empty value from a comma-separated forwarded header. */
export function firstForwardedValue(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => part.trim())
    .find(Boolean) || '';
}

/** Resolve the canonical site base URL from env → request headers → default. */
export function resolveCanonicalSiteBaseUrl(request?: NextRequest): string {
  const fromEnv =
    normalizeSiteBaseUrl(process.env.TELEGRAM_PUBLIC_BASE_URL) ||
    normalizeSiteBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeSiteBaseUrl(process.env.SITE_URL);
  if (fromEnv) return fromEnv;

  if (request) {
    const forwardedProto = firstForwardedValue(request.headers.get('x-forwarded-proto'));
    const forwardedHost = firstForwardedValue(request.headers.get('x-forwarded-host'));
    const hostHeader = firstForwardedValue(request.headers.get('host'));
    const host = forwardedHost || hostHeader;
    const protocol =
      forwardedProto ||
      (request.nextUrl?.protocol || '').replace(':', '') ||
      'https';
    const fromHeaders = normalizeSiteBaseUrl(host ? `${protocol}://${host}` : '');
    if (fromHeaders) return fromHeaders;

    const fromRequest = normalizeSiteBaseUrl(request.nextUrl?.origin);
    if (fromRequest) return fromRequest;
  }

  return getSiteBaseUrl();
}

/** Build an absolute site URL for a path, preferring the given base. */
export function buildAbsoluteSiteUrl(path: string, preferredBaseUrl?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base =
    normalizeSiteBaseUrl(preferredBaseUrl) ||
    normalizeSiteBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeSiteBaseUrl(process.env.SITE_URL) ||
    getSiteBaseUrl();
  try {
    return new URL(normalizedPath, `${base}/`).toString();
  } catch {
    return buildSiteUrl(normalizedPath);
  }
}

/** Resolve a published article URL from slug (preferred) or fallback URL. */
export function resolveSubmissionArticleUrl(
  fallbackUrl: string | null | undefined,
  slug: string | null | undefined,
  locale: 'en' | 'pl',
  preferredBaseUrl?: string
): string | null {
  const normalizedSlug = (slug || '').trim();
  if (normalizedSlug) {
    return buildAbsoluteSiteUrl(`/${locale}/article/${normalizedSlug}`, preferredBaseUrl);
  }
  const rawUrl = (fallbackUrl || '').trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return buildAbsoluteSiteUrl(path, preferredBaseUrl);
  } catch {
    return rawUrl;
  }
}

/** Human-readable label for a content style. */
export function getStyleLabel(style: ContentStyle | string): string {
  const labels: Record<string, string> = {
    journalistic: 'Journalistic',
    keep_as_is: 'Keep As Is',
    seo_optimized: 'SEO',
    academic: 'Academic',
    casual: 'Casual',
    technical: 'Technical',
  };
  return labels[style] || style;
}

/** Extract and de-duplicate http(s) URLs from free text, trimming trailing punctuation. */
export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const normalized = matches.map((url) => url.replace(/[),.;!?]+$/g, '').trim());
  return Array.from(new Set(normalized.filter(Boolean)));
}

/** Map a free-form content-style string to a canonical ContentStyle, or null. */
export function normalizeContentStyle(rawValue?: string): ContentStyle | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ContentStyle> = {
    journalistic: 'journalistic',
    journal: 'journalistic',
    keep_as_is: 'keep_as_is',
    'keep-as-is': 'keep_as_is',
    keepasis: 'keep_as_is',
    asis: 'keep_as_is',
    original: 'keep_as_is',
    seo_optimized: 'seo_optimized',
    'seo-optimized': 'seo_optimized',
    seo: 'seo_optimized',
    academic: 'academic',
    casual: 'casual',
    technical: 'technical',
    tech: 'technical',
  };
  return aliases[value] || null;
}

/** Map a free-form images-source string to a canonical ImagesSource, or null. */
export function normalizeImagesSource(rawValue?: string): ImagesSource | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ImagesSource> = {
    unsplash: 'unsplash',
    stock: 'unsplash',
    ai: 'ai',
    dalle: 'ai',
    none: 'none',
    off: 'none',
    no: 'none',
  };
  return aliases[value] || null;
}

/** Parse an on/off-style string to boolean, or null if unrecognized. */
export function normalizeAutoPublish(rawValue?: string): boolean | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'y', 'enable'].includes(value)) return true;
  if (['off', 'false', '0', 'no', 'n', 'disable'].includes(value)) return false;
  return null;
}

/** Parse a single/batch-mode string to boolean (single=true), or null. */
export function normalizeCombineMode(rawValue?: string): boolean | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  if (['single', 'one', 'combined', 'on', 'true', '1', 'yes'].includes(value)) return true;
  if (['batch', 'multi', 'off', 'false', '0', 'no'].includes(value)) return false;
  return null;
}

/** Map a free-form interface-language string to a canonical InterfaceLanguage, or null. */
export function normalizeInterfaceLanguage(rawValue?: string): InterfaceLanguage | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, InterfaceLanguage> = {
    ru: 'ru',
    russian: 'ru',
    'русский': 'ru',
    en: 'en',
    english: 'en',
    eng: 'en',
    pl: 'pl',
    polish: 'pl',
    polski: 'pl',
  };
  return aliases[value] || null;
}

/** Derive interface language from a Telegram language_code (defaults to ru). */
export function getLanguageFromTelegramCode(languageCode?: string): InterfaceLanguage {
  if (!languageCode) return 'ru';
  const normalized = languageCode.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('pl')) return 'pl';
  return 'ru';
}

/** Pick a localized string for the given interface language. */
export function localize(lang: InterfaceLanguage, ru: string, en: string, pl: string): string {
  if (lang === 'en') return en;
  if (lang === 'pl') return pl;
  return ru;
}

/** Escape a string for safe use inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip the given URLs from text, returning the remaining "context" prose. */
export function extractAdditionalContext(text: string, urls: string[]): string {
  if (!text || urls.length === 0) return text.trim();
  let normalized = text;
  for (const url of urls) {
    normalized = normalized.replace(new RegExp(escapeRegExp(url), 'g'), ' ');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}
