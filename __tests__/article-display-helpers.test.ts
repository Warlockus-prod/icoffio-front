/**
 * Tests for the admin article-display helpers extracted from ArticlesManager.tsx (v10.20.6).
 */

import { describe, it, expect } from 'vitest';
import {
  isLikelyTemporaryImage,
  isKnownPlaceholderImage,
  hasCustomPersistentImage,
  normalizeArticleImage,
  getCanonicalSlugKey,
  getSourceGroup,
  normalizeViews,
} from '../lib/admin/article-display-helpers';

describe('image classification', () => {
  it('isLikelyTemporaryImage flags DALL·E / signed URLs', () => {
    expect(isLikelyTemporaryImage('https://oaidalleapiprod.blob.net/x')).toBe(true);
    expect(isLikelyTemporaryImage('https://x.com/i?sig=a')).toBe(true);
    expect(isLikelyTemporaryImage('https://cdn.com/i.jpg')).toBe(false);
  });
  it('isKnownPlaceholderImage flags stock markers', () => {
    expect(isKnownPlaceholderImage('https://u.com/photo-1485827404703-89b55fcc595e')).toBe(true);
    expect(isKnownPlaceholderImage('https://cdn.com/custom.jpg')).toBe(false);
  });
  it('hasCustomPersistentImage true only for real custom images', () => {
    expect(hasCustomPersistentImage('https://cdn.icoffio.com/real.jpg')).toBe(true);
    expect(hasCustomPersistentImage('https://u.com/photo-1485827404703-89b55fcc595e')).toBe(false);
    expect(hasCustomPersistentImage('https://x.com/i?sig=a')).toBe(false);
    expect(hasCustomPersistentImage('')).toBe(false);
    expect(hasCustomPersistentImage(undefined)).toBe(false);
  });
  it('normalizeArticleImage blanks whitespace', () => {
    expect(normalizeArticleImage('  ')).toBe('');
    expect(normalizeArticleImage('https://x/y.jpg')).toBe('https://x/y.jpg');
    expect(normalizeArticleImage(undefined)).toBe('');
  });
});

describe('getCanonicalSlugKey', () => {
  it('collapses EN/PL slug variants by base + lang', () => {
    expect(getCanonicalSlugKey('my-post-en', 'en')).toBe('my-post::en');
    expect(getCanonicalSlugKey('my-post-pl', 'pl')).toBe('my-post::pl');
    expect(getCanonicalSlugKey('my-post-en-2', 'en')).toBe('my-post::en');
  });
  it('falls back to language param when slug has no suffix', () => {
    expect(getCanonicalSlugKey('plain-slug', 'pl')).toBe('plain-slug::pl');
    expect(getCanonicalSlugKey('plain-slug-3', 'en')).toBe('plain-slug::en');
  });
});

describe('getSourceGroup', () => {
  it.each([
    ['telegram-bot', 'telegram'],
    ['admin-panel', 'admin'],
    ['static-seed', 'static'],
    ['supabase', 'supabase'],
    ['url-parse', 'supabase'],
    ['text-generate', 'supabase'],
    ['some-api', 'supabase'],
    ['weird', 'other'],
    [undefined, 'other'],
  ])('%s → %s', (input, expected) => {
    expect(getSourceGroup(input as any)).toBe(expected);
  });
});

describe('normalizeViews', () => {
  it('returns first valid finite non-negative number', () => {
    expect(normalizeViews(undefined, null, 42)).toBe(42);
    expect(normalizeViews('100')).toBe(100);
    expect(normalizeViews(-5, '7')).toBe(7);
    expect(normalizeViews('abc', 0)).toBe(0);
    expect(normalizeViews(NaN, Infinity, 'x')).toBe(0);
  });
});
