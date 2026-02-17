import { sanitizeExcerptText } from './content-formatter';

export const TITLE_MIN_LENGTH = 55;
export const TITLE_MAX_LENGTH = 95;

interface TitlePolicyOptions {
  minLength?: number;
  maxLength?: number;
  fallback?: string;
  language?: string;
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

function clampByComma(value: string, minLength: number, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const commaParts = value.split(',');
  if (commaParts.length < 2) {
    return '';
  }

  let candidate = commaParts[0].trim();
  for (let i = 1; i < commaParts.length; i += 1) {
    const next = `${candidate}, ${commaParts[i].trim()}`.trim();
    if (next.length > maxLength) break;
    candidate = next;
  }

  if (candidate.length >= minLength && candidate.length <= maxLength) {
    return candidate.replace(/[,:;.!?_\-–—]+$/g, '').trim();
  }

  return '';
}

function removeTrailingClause(value: string, minLength: number, maxLength: number): string {
  const patterns = [
    /,\s*(which|that|who|while|where|when)\b.*$/i,
    /,\s*(kt[oó]ry|kt[oó]ra|kt[oó]re|kt[oó]rego|kt[oó]r[ąa]|co|aby|żeby)\b.*$/i,
    /\.\s+.*$/,
    /:\s+.*$/,
    /\s+[–—-]\s+.*$/,
  ];

  for (const pattern of patterns) {
    const candidate = value.replace(pattern, '').replace(/[,:;.!?_\-–—]+$/g, '').trim();
    if (candidate.length >= minLength && candidate.length <= maxLength) {
      return candidate;
    }
  }

  return '';
}

function semanticShorten(value: string, minLength: number, maxLength: number): string {
  const stripped = value.replace(/\s+/g, ' ').trim();
  if (!stripped) return '';
  if (stripped.length <= maxLength) return stripped;

  const byClause = removeTrailingClause(stripped, minLength, maxLength);
  if (byClause) return byClause;

  const byComma = clampByComma(stripped, minLength, maxLength);
  if (byComma) return byComma;

  return '';
}

export function normalizeTitleForPublishing(
  rawTitle: string,
  options: TitlePolicyOptions = {}
): string {
  const minLength = Math.max(10, options.minLength ?? TITLE_MIN_LENGTH);
  const maxLength = Math.max(20, options.maxLength ?? TITLE_MAX_LENGTH);
  const fallback = String(options.fallback || DEFAULT_FALLBACK_TITLE).trim() || DEFAULT_FALLBACK_TITLE;

  const cleaned = sanitizeExcerptText(String(rawTitle || ''), Math.max(maxLength * 3, 260))
    .replace(/\u2026/g, '...')
    .replace(/[.]{3,}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const baseTitle = cleaned || fallback;
  const semanticTitle = semanticShorten(baseTitle, minLength, maxLength);
  if (semanticTitle) {
    return semanticTitle;
  }

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
