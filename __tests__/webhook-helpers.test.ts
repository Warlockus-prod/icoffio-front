/**
 * Tests for the pure helpers extracted from the Telegram webhook (v10.19.0).
 * These guard the input-normalization + URL-building logic that drives the
 * publishing pipeline — previously untested because they were inline in a 2787-line route.
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  normalizeSiteBaseUrl,
  firstForwardedValue,
  buildAbsoluteSiteUrl,
  resolveSubmissionArticleUrl,
  getStyleLabel,
  extractUrls,
  normalizeContentStyle,
  normalizeImagesSource,
  normalizeAutoPublish,
  normalizeCombineMode,
  normalizeInterfaceLanguage,
  getLanguageFromTelegramCode,
  localize,
  escapeRegExp,
  extractAdditionalContext,
} from '../lib/telegram-simple/webhook-helpers';

describe('escapeHtml', () => {
  it('escapes all 5 HTML-significant chars', () => {
    expect(escapeHtml(`<a href="x" id='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; id=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
  it('leaves plain text untouched', () => {
    expect(escapeHtml('Hello world 123')).toBe('Hello world 123');
  });
});

describe('normalizeSiteBaseUrl', () => {
  it.each([
    ['https://web.icoffio.com', 'https://web.icoffio.com'],
    ['https://web.icoffio.com/path?q=1', 'https://web.icoffio.com'],
    ['http://localhost:4200', 'http://localhost:4200'],
    ['  https://x.com  ', 'https://x.com'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeSiteBaseUrl(input)).toBe(expected);
  });
  it.each(['', undefined, 'not-a-url', 'ftp://x.com', 'javascript:alert(1)'])(
    '%s → null',
    (input) => {
      expect(normalizeSiteBaseUrl(input as any)).toBeNull();
    },
  );
});

describe('firstForwardedValue', () => {
  it('returns first non-empty comma value', () => {
    expect(firstForwardedValue('1.2.3.4, 5.6.7.8')).toBe('1.2.3.4');
    expect(firstForwardedValue('  , a, b')).toBe('a');
  });
  it('handles empty/null', () => {
    expect(firstForwardedValue('')).toBe('');
    expect(firstForwardedValue(null)).toBe('');
    expect(firstForwardedValue(undefined)).toBe('');
  });
});

describe('buildAbsoluteSiteUrl', () => {
  it('builds absolute URL from path + preferred base', () => {
    expect(buildAbsoluteSiteUrl('/en/article/foo', 'https://web.icoffio.com')).toBe(
      'https://web.icoffio.com/en/article/foo',
    );
  });
  it('prepends slash to bare path', () => {
    expect(buildAbsoluteSiteUrl('en/x', 'https://web.icoffio.com')).toBe('https://web.icoffio.com/en/x');
  });
});

describe('resolveSubmissionArticleUrl', () => {
  it('prefers slug over fallback URL', () => {
    expect(resolveSubmissionArticleUrl('https://old.com/x', 'my-slug-en', 'en', 'https://web.icoffio.com')).toBe(
      'https://web.icoffio.com/en/article/my-slug-en',
    );
  });
  it('uses fallback URL path when no slug', () => {
    expect(resolveSubmissionArticleUrl('https://old.com/news/x?a=1', null, 'pl', 'https://web.icoffio.com')).toBe(
      'https://web.icoffio.com/news/x?a=1',
    );
  });
  it('returns null when nothing provided', () => {
    expect(resolveSubmissionArticleUrl(null, null, 'en', 'https://web.icoffio.com')).toBeNull();
  });
});

describe('getStyleLabel', () => {
  it('maps known styles', () => {
    expect(getStyleLabel('seo_optimized')).toBe('SEO');
    expect(getStyleLabel('keep_as_is')).toBe('Keep As Is');
  });
  it('passes through unknown', () => {
    expect(getStyleLabel('weird')).toBe('weird');
  });
});

describe('extractUrls', () => {
  it('extracts + dedupes + trims trailing punctuation', () => {
    expect(extractUrls('see https://a.com, and https://a.com! plus https://b.com.')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
  it('returns empty array for no URLs', () => {
    expect(extractUrls('no links here')).toEqual([]);
  });
});

describe('normalize* aliases', () => {
  it('content style', () => {
    expect(normalizeContentStyle('SEO')).toBe('seo_optimized');
    expect(normalizeContentStyle('asis')).toBe('keep_as_is');
    expect(normalizeContentStyle('tech')).toBe('technical');
    expect(normalizeContentStyle('garbage')).toBeNull();
    expect(normalizeContentStyle(undefined)).toBeNull();
  });
  it('images source', () => {
    expect(normalizeImagesSource('stock')).toBe('unsplash');
    expect(normalizeImagesSource('dalle')).toBe('ai');
    expect(normalizeImagesSource('off')).toBe('none');
    expect(normalizeImagesSource('x')).toBeNull();
  });
  it('auto publish', () => {
    expect(normalizeAutoPublish('yes')).toBe(true);
    expect(normalizeAutoPublish('disable')).toBe(false);
    expect(normalizeAutoPublish('maybe')).toBeNull();
  });
  it('combine mode', () => {
    expect(normalizeCombineMode('single')).toBe(true);
    expect(normalizeCombineMode('batch')).toBe(false);
    expect(normalizeCombineMode('x')).toBeNull();
  });
  it('interface language', () => {
    expect(normalizeInterfaceLanguage('russian')).toBe('ru');
    expect(normalizeInterfaceLanguage('polski')).toBe('pl');
    expect(normalizeInterfaceLanguage('eng')).toBe('en');
    expect(normalizeInterfaceLanguage('fr')).toBeNull();
  });
});

describe('getLanguageFromTelegramCode', () => {
  it.each([
    ['en-US', 'en'],
    ['pl', 'pl'],
    ['ru-RU', 'ru'],
    ['de', 'ru'], // unsupported → default ru
    [undefined, 'ru'],
  ])('%s → %s', (code, expected) => {
    expect(getLanguageFromTelegramCode(code as any)).toBe(expected);
  });
});

describe('localize', () => {
  it('picks correct language', () => {
    expect(localize('en', 'РУ', 'EN', 'PL')).toBe('EN');
    expect(localize('pl', 'РУ', 'EN', 'PL')).toBe('PL');
    expect(localize('ru', 'РУ', 'EN', 'PL')).toBe('РУ');
  });
});

describe('escapeRegExp', () => {
  it('escapes regex metachars', () => {
    expect(escapeRegExp('a.b*c?')).toBe('a\\.b\\*c\\?');
  });
});

describe('extractAdditionalContext', () => {
  it('strips URLs leaving context prose', () => {
    expect(extractAdditionalContext('check https://a.com please now', ['https://a.com'])).toBe('check please now');
  });
  it('returns trimmed text when no URLs', () => {
    expect(extractAdditionalContext('  just text  ', [])).toBe('just text');
  });
});
