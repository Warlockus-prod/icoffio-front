import { sanitizeExcerptText } from './content-formatter';

export const TITLE_MIN_LENGTH = 55;
export const TITLE_MAX_LENGTH = 95;

interface TitlePolicyOptions {
  minLength?: number;
  maxLength?: number;
  fallback?: string;
}

export interface TitlePolicyResult {
  title: string;
  length: number;
  minLength: number;
  maxLength: number;
  issues: string[];
  isValid: boolean;
}

const DEFAULT_FALLBACK_TITLE = 'Untitled Article';

function truncateTitleAtWordBoundary(value: string, maxLength: number): string {
  if (!value || value.length <= maxLength) {
    return value.trim();
  }

  const head = value.slice(0, maxLength + 1).trim();
  const cutAt = head.lastIndexOf(' ');
  const minWordBoundary = Math.floor(maxLength * 0.65);
  const preferredCut =
    cutAt >= minWordBoundary
      ? head.slice(0, cutAt)
      : head.slice(0, maxLength);

  const normalized = preferredCut.replace(/[\s,:;.!?_\-–—]+$/g, '').trim();
  if (normalized) {
    return normalized;
  }

  return value.slice(0, maxLength).trim();
}

export function normalizeTitleForPublishing(
  rawTitle: string,
  options: TitlePolicyOptions = {}
): string {
  const maxLength = Math.max(20, options.maxLength ?? TITLE_MAX_LENGTH);
  const fallback = String(options.fallback || DEFAULT_FALLBACK_TITLE).trim() || DEFAULT_FALLBACK_TITLE;

  const cleaned = sanitizeExcerptText(String(rawTitle || ''), Math.max(maxLength * 3, 260))
    .replace(/\u2026/g, '...')
    .replace(/[.]{3,}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const baseTitle = cleaned || fallback;
  return truncateTitleAtWordBoundary(baseTitle, maxLength);
}

export function evaluateTitlePolicy(
  rawTitle: string,
  options: TitlePolicyOptions = {}
): TitlePolicyResult {
  const minLength = Math.max(10, options.minLength ?? TITLE_MIN_LENGTH);
  const maxLength = Math.max(minLength, options.maxLength ?? TITLE_MAX_LENGTH);
  const title = normalizeTitleForPublishing(rawTitle, {
    fallback: options.fallback,
    maxLength,
  });

  const length = title.length;
  const issues: string[] = [];

  if (length < minLength) {
    issues.push(`Title is too short (${length} chars). Minimum required is ${minLength}.`);
  }
  if (length > maxLength) {
    issues.push(`Title is too long (${length} chars). Maximum allowed is ${maxLength}.`);
  }

  return {
    title,
    length,
    minLength,
    maxLength,
    issues,
    isValid: issues.length === 0,
  };
}
