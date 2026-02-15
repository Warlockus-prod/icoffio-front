/**
 * Shared helpers for deriving concise image prompts/queries from an article title.
 */

const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'so', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'about', 'into', 'over', 'under', 'after', 'before',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those',
  'it', 'its', 'as', 'via', 'how', 'why', 'what', 'when', 'where',
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

export function extractTitleKeywords(title: string, maxKeywords: number = 5): string[] {
  if (!title || !title.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const words = title
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));

  const keywords: string[] = [];
  for (const word of words) {
    if (seen.has(word)) {
      continue;
    }
    seen.add(word);
    keywords.push(word);
    if (keywords.length >= maxKeywords) {
      break;
    }
  }

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
