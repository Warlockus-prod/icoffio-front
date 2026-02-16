/**
 * Shared helpers for deriving concise image prompts/queries from an article title.
 */

const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'so', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'about', 'into', 'over', 'under', 'after', 'before',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those',
  'it', 'its', 'as', 'via', 'how', 'why', 'what', 'when', 'where',
  // Generic words that reduce image relevance
  'more', 'most', 'less', 'best', 'better', 'good', 'great', 'new', 'now', 'ago', 'long',
  'deal', 'option', 'value', 'just',
  // Russian
  'и', 'или', 'но', 'а', 'в', 'во', 'на', 'по', 'к', 'ко', 'из', 'от', 'до', 'за', 'о', 'об',
  'про', 'для', 'с', 'со', 'у', 'не', 'это', 'как', 'что', 'когда', 'где', 'почему', 'ли',
  // Polish (frequent fillers in translated titles)
  'i', 'oraz', 'ale', 'w', 'we', 'na', 'do', 'z', 'ze', 'od', 'po', 'za', 'o', 'u', 'to', 'jak'
]);

function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9а-яёąęćłńóśźż-]/gi, '')
    .trim();
}

interface KeywordExtractionOptions {
  maxKeywords: number;
  minLength: number;
  seen?: Set<string>;
}

function collectKeywords(
  input: string,
  { maxKeywords, minLength, seen = new Set<string>() }: KeywordExtractionOptions
): string[] {
  if (!input || !input.trim() || maxKeywords <= 0) {
    return [];
  }

  const words = input
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= minLength)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));

  const keywords: string[] = [];
  for (const word of words) {
    if (seen.has(word)) continue;
    seen.add(word);
    keywords.push(word);
    if (keywords.length >= maxKeywords) break;
  }
  return keywords;
}

export function extractTitleKeywords(title: string, maxKeywords: number = 5): string[] {
  if (!title || !title.trim()) {
    return [];
  }

  const keywords = collectKeywords(title, { maxKeywords, minLength: 3 });

  if (keywords.length > 0) {
    return keywords;
  }

  // Fallback: keep the first normalized words if title is mostly stop-words.
  return title
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 2)
    .slice(0, Math.max(1, maxKeywords));
}

export function buildTitleKeywordPhrase(title: string, maxKeywords: number = 4): string {
  const keywords = extractTitleKeywords(title, maxKeywords);
  if (keywords.length > 0) {
    return keywords.join(' ');
  }

  return title.trim();
}

export interface ImageKeywordInput {
  title: string;
  excerpt?: string;
  category?: string;
}

export function extractImageKeywords(
  input: ImageKeywordInput,
  maxKeywords: number = 7
): string[] {
  const seen = new Set<string>();

  const titleKeywords = collectKeywords(input.title, {
    maxKeywords,
    minLength: 3,
    seen,
  });

  const categoryKeywords = collectKeywords(input.category || '', {
    maxKeywords: 2,
    minLength: 3,
    seen,
  });

  const excerptSample = (input.excerpt || '').slice(0, 500);
  const contextKeywords = collectKeywords(excerptSample, {
    maxKeywords: Math.max(maxKeywords, 6),
    minLength: 4,
    seen,
  });

  const combined = [...titleKeywords, ...categoryKeywords, ...contextKeywords].slice(0, maxKeywords);
  if (combined.length > 0) {
    return combined;
  }

  return extractTitleKeywords(input.title, maxKeywords);
}

export function buildImageKeywordPhrase(input: ImageKeywordInput, maxKeywords: number = 5): string {
  const keywords = extractImageKeywords(input, maxKeywords);
  if (keywords.length > 0) {
    return keywords.join(' ');
  }
  return (input.title || '').trim();
}
