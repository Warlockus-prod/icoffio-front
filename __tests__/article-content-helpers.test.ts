/**
 * Tests for the pure content helpers extracted from app/api/articles/route.ts (v10.20.6).
 * These guard image/category/url validation used across the article creation pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  isLikelyTemporaryImage,
  isPlaceholderImage,
  truncateText,
  normalizeCategory,
  uniqueIssueList,
  isValidHttpUrl,
} from '../lib/articles/content-helpers';

describe('isLikelyTemporaryImage', () => {
  it('flags DALL·E and signed-URL images', () => {
    expect(isLikelyTemporaryImage('https://oaidalleapiprod.blob.core.windows.net/x.png')).toBe(true);
    expect(isLikelyTemporaryImage('https://cdn.com/x.png?st=2026&sig=abc')).toBe(true);
  });
  it('does not flag normal images', () => {
    expect(isLikelyTemporaryImage('https://cdn.com/photo.jpg')).toBe(false);
    expect(isLikelyTemporaryImage(undefined)).toBe(false);
  });
});

describe('isPlaceholderImage', () => {
  it('flags known stock placeholders', () => {
    expect(isPlaceholderImage('https://images.unsplash.com/photo-1485827404703-89b55fcc595e')).toBe(true);
    expect(isPlaceholderImage('https://images.unsplash.com/photo-1518770660439-4636190af475')).toBe(true);
  });
  it('flags temporary images too', () => {
    expect(isPlaceholderImage('https://x.com/y?sig=z')).toBe(true);
  });
  it('passes real images', () => {
    expect(isPlaceholderImage('https://cdn.icoffio.com/real.jpg')).toBe(false);
    expect(isPlaceholderImage('')).toBe(false);
  });
});

describe('truncateText', () => {
  it('returns text unchanged when within limit', () => {
    expect(truncateText('short', 100)).toBe('short');
  });
  it('truncates + appends marker when over limit', () => {
    const r = truncateText('a'.repeat(50), 10);
    expect(r).toBe(`${'a'.repeat(10)}\n\n[truncated]`);
  });
  it('handles empty', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('normalizeCategory', () => {
  it.each([
    ['ai', 'ai'],
    ['AI', 'ai'],
    ['  Games  ', 'games'],
    ['tech', 'tech'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCategory(input)).toBe(expected);
  });
  it('falls back to tech for unknown', () => {
    expect(normalizeCategory('crypto')).toBe('tech');
    expect(normalizeCategory(undefined)).toBe('tech');
    expect(normalizeCategory(null)).toBe('tech');
  });
  it('respects custom fallback', () => {
    expect(normalizeCategory('nope', 'ai')).toBe('ai');
  });
});

describe('uniqueIssueList', () => {
  it('dedupes + trims + drops empties', () => {
    expect(uniqueIssueList(['  a ', 'a', '', 'b', '  '])).toEqual(['a', 'b']);
  });
});

describe('isValidHttpUrl', () => {
  it.each(['https://x.com', 'http://localhost:3000/path?q=1'])('accepts %s', (u) => {
    expect(isValidHttpUrl(u)).toBe(true);
  });
  it.each(['ftp://x.com', 'not-a-url', '', 'javascript:alert(1)'])('rejects %s', (u) => {
    expect(isValidHttpUrl(u)).toBe(false);
  });
});
