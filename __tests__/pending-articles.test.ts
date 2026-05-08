/**
 * Tests for in-memory pending-articles store (Telegram bot category-selection flow).
 * Critical: holds article data between user messages — bug here = lost articles after URL parse.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setPendingArticle,
  getPendingArticle,
  removePendingArticle,
  updatePendingCategory,
} from '../lib/telegram-simple/pending-articles';

const ARTICLE = {
  title: 'Test',
  content: 'Body',
  excerpt: 'X',
  category: 'tech',
  wordCount: 100,
};

describe('pending-articles store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
  });

  afterEach(() => {
    // Clear any leftover entries between tests by removing every test chat
    [1001, 1002, 1003, 9999, 0, -1].forEach(removePendingArticle);
    vi.useRealTimers();
  });

  it('set then get returns the entry', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: true, originalText: 'https://x.com' });
    const got = getPendingArticle(1001);
    expect(got).not.toBeNull();
    expect(got!.chatId).toBe(1001);
    expect(got!.article.title).toBe('Test');
    expect(got!.isUrl).toBe(true);
    expect(got!.originalText).toBe('https://x.com');
    expect(got!.createdAt).toBe(1_700_000_000_000);
  });

  it('get returns null for unknown chatId', () => {
    expect(getPendingArticle(9999)).toBeNull();
  });

  it('overwrites existing entry on set', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: false, originalText: 'first' });
    setPendingArticle(1001, { article: { ...ARTICLE, title: 'Second' }, isUrl: true, originalText: 'second' });
    const got = getPendingArticle(1001);
    expect(got!.article.title).toBe('Second');
    expect(got!.isUrl).toBe(true);
    expect(got!.originalText).toBe('second');
  });

  it('removePendingArticle deletes the entry', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: false, originalText: 't' });
    expect(getPendingArticle(1001)).not.toBeNull();
    removePendingArticle(1001);
    expect(getPendingArticle(1001)).toBeNull();
  });

  it('removePendingArticle on missing chatId is a no-op', () => {
    expect(() => removePendingArticle(9999)).not.toThrow();
  });

  it('updatePendingCategory mutates existing category', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: false, originalText: 't' });
    expect(updatePendingCategory(1001, 'gaming')).toBe(true);
    expect(getPendingArticle(1001)!.article.category).toBe('gaming');
  });

  it('updatePendingCategory returns false when chat is missing', () => {
    expect(updatePendingCategory(9999, 'tech')).toBe(false);
  });

  it('TTL: get returns null after 5 minutes', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: false, originalText: 't' });
    expect(getPendingArticle(1001)).not.toBeNull();
    // Advance 5 min + 1 sec
    vi.setSystemTime(1_700_000_000_000 + 5 * 60 * 1000 + 1);
    expect(getPendingArticle(1001)).toBeNull();
  });

  it('TTL: still valid at 4 minutes 59 seconds', () => {
    setPendingArticle(1001, { article: ARTICLE, isUrl: false, originalText: 't' });
    vi.setSystemTime(1_700_000_000_000 + 4 * 60 * 1000 + 59 * 1000);
    expect(getPendingArticle(1001)).not.toBeNull();
  });

  it('isolates entries by chatId', () => {
    setPendingArticle(1001, { article: { ...ARTICLE, title: 'A' }, isUrl: false, originalText: '' });
    setPendingArticle(1002, { article: { ...ARTICLE, title: 'B' }, isUrl: false, originalText: '' });
    expect(getPendingArticle(1001)!.article.title).toBe('A');
    expect(getPendingArticle(1002)!.article.title).toBe('B');
    removePendingArticle(1001);
    expect(getPendingArticle(1001)).toBeNull();
    expect(getPendingArticle(1002)!.article.title).toBe('B');
  });

  it('handles negative or zero chatId without throwing', () => {
    setPendingArticle(0, { article: ARTICLE, isUrl: false, originalText: '' });
    setPendingArticle(-1, { article: ARTICLE, isUrl: false, originalText: '' });
    expect(getPendingArticle(0)).not.toBeNull();
    expect(getPendingArticle(-1)).not.toBeNull();
  });
});
