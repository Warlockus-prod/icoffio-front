/**
 * Unit tests for core data layer utilities
 */
import { describe, it, expect } from 'vitest';

// We test the exported utility functions from data.ts
// Since data.ts has some server-side functions, we extract testable logic here

// ── normalizeCategory ──

function normalizeCategory(raw: unknown): { name: string; slug: string } {
  if (raw && typeof raw === 'object' && 'slug' in raw) {
    return raw as { name: string; slug: string };
  }
  if (typeof raw === 'string' && raw.trim()) {
    return { name: raw, slug: raw.toLowerCase().replace(/\s+/g, '-') };
  }
  return { name: 'General', slug: 'general' };
}

describe('normalizeCategory', () => {
  it('returns Category object as-is', () => {
    const cat = { name: 'Technology', slug: 'tech' };
    expect(normalizeCategory(cat)).toEqual(cat);
  });

  it('converts string to Category object', () => {
    expect(normalizeCategory('Artificial Intelligence')).toEqual({
      name: 'Artificial Intelligence',
      slug: 'artificial-intelligence',
    });
  });

  it('converts simple string', () => {
    expect(normalizeCategory('tech')).toEqual({ name: 'tech', slug: 'tech' });
  });

  it('returns default for null', () => {
    expect(normalizeCategory(null)).toEqual({ name: 'General', slug: 'general' });
  });

  it('returns default for undefined', () => {
    expect(normalizeCategory(undefined)).toEqual({ name: 'General', slug: 'general' });
  });

  it('returns default for empty string', () => {
    expect(normalizeCategory('')).toEqual({ name: 'General', slug: 'general' });
  });

  it('returns default for whitespace-only string', () => {
    expect(normalizeCategory('   ')).toEqual({ name: 'General', slug: 'general' });
  });
});

// ── filterArticlesByLanguage logic ──

function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

function hasPolish(text: string): boolean {
  return /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text);
}

function filterByLanguage(
  articles: Array<{ slug: string; title: string; excerpt?: string; content?: string }>,
  locale: string
) {
  if (!['en', 'pl'].includes(locale)) return [];

  return articles.filter(article => {
    const slugHasLocale = article.slug.includes(`-${locale}`);
    const text = `${article.title} ${article.excerpt || ''} ${article.content || ''}`;

    if (locale === 'en') {
      if (hasCyrillic(text) || hasPolish(text)) return false;
      return slugHasLocale || (!hasCyrillic(text) && !hasPolish(text));
    }

    if (locale === 'pl') {
      if (hasCyrillic(text)) return false;
      return slugHasLocale;
    }

    return false;
  });
}

describe('filterByLanguage', () => {
  const articles = [
    { slug: 'hello-world-en', title: 'Hello World', excerpt: 'English article' },
    { slug: 'witaj-swiecie-pl', title: 'Witaj świecie', excerpt: 'Polski artykuł' },
    { slug: 'privet-mir-ru', title: 'Привет мир', excerpt: 'Русская статья' },
    { slug: 'tech-news-en', title: 'Tech News Today', excerpt: 'Latest tech' },
    { slug: 'no-suffix', title: 'Generic Article', excerpt: 'No language suffix' },
  ];

  it('returns EN articles (with -en slug)', () => {
    const result = filterByLanguage(articles, 'en');
    expect(result.map(a => a.slug)).toContain('hello-world-en');
    expect(result.map(a => a.slug)).toContain('tech-news-en');
  });

  it('excludes Cyrillic from EN', () => {
    const result = filterByLanguage(articles, 'en');
    expect(result.map(a => a.slug)).not.toContain('privet-mir-ru');
  });

  it('excludes Polish characters from EN', () => {
    const result = filterByLanguage(articles, 'en');
    expect(result.map(a => a.slug)).not.toContain('witaj-swiecie-pl');
  });

  it('returns PL articles (with -pl slug)', () => {
    const result = filterByLanguage(articles, 'pl');
    expect(result.map(a => a.slug)).toContain('witaj-swiecie-pl');
  });

  it('excludes Cyrillic from PL', () => {
    const result = filterByLanguage(articles, 'pl');
    expect(result.map(a => a.slug)).not.toContain('privet-mir-ru');
  });

  it('returns empty for unsupported locale', () => {
    expect(filterByLanguage(articles, 'de')).toEqual([]);
    expect(filterByLanguage(articles, 'ru')).toEqual([]);
  });

  it('includes suffix-less English articles in EN', () => {
    const result = filterByLanguage(articles, 'en');
    expect(result.map(a => a.slug)).toContain('no-suffix');
  });
});

// ── hasCyrillic / hasPolish ──

describe('hasCyrillic', () => {
  it('detects Russian text', () => {
    expect(hasCyrillic('Привет')).toBe(true);
  });

  it('returns false for English', () => {
    expect(hasCyrillic('Hello World')).toBe(false);
  });

  it('returns false for Polish', () => {
    expect(hasCyrillic('Cześć świat')).toBe(false);
  });
});

describe('hasPolish', () => {
  it('detects Polish characters', () => {
    expect(hasPolish('Cześć')).toBe(true);
    expect(hasPolish('łódź')).toBe(true);
    expect(hasPolish('żółw')).toBe(true);
  });

  it('returns false for English', () => {
    expect(hasPolish('Hello World')).toBe(false);
  });

  it('returns false for Russian', () => {
    expect(hasPolish('Привет мир')).toBe(false);
  });
});
