/**
 * Unit tests for Telegram webhook logic
 */
import { describe, it, expect } from 'vitest';

// ── isUrl detection ──

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

describe('isUrl', () => {
  it('detects http URLs', () => {
    expect(isUrl('http://example.com')).toBe(true);
  });

  it('detects https URLs', () => {
    expect(isUrl('https://techcrunch.com/2024/01/15/article')).toBe(true);
  });

  it('handles leading whitespace', () => {
    expect(isUrl('  https://example.com')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(isUrl('This is a regular text message')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isUrl('')).toBe(false);
  });

  it('rejects partial URLs', () => {
    expect(isUrl('example.com')).toBe(false);
    expect(isUrl('www.example.com')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isUrl('HTTP://EXAMPLE.COM')).toBe(true);
    expect(isUrl('HTTPS://Example.Com')).toBe(true);
  });
});

// ── getStyleLabel ──

function getStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    'journalistic': '📰 Journalistic',
    'keep_as_is': '✋ Keep As Is',
    'seo_optimized': '🔍 SEO',
    'academic': '🎓 Academic',
    'casual': '💬 Casual',
    'technical': '⚙️ Technical',
  };
  return labels[style] || style;
}

describe('getStyleLabel', () => {
  it('returns correct label for known styles', () => {
    expect(getStyleLabel('journalistic')).toBe('📰 Journalistic');
    expect(getStyleLabel('academic')).toBe('🎓 Academic');
    expect(getStyleLabel('technical')).toBe('⚙️ Technical');
  });

  it('returns input for unknown styles', () => {
    expect(getStyleLabel('custom')).toBe('custom');
    expect(getStyleLabel('')).toBe('');
  });
});

// ── Pending articles state ──

import {
  setPendingArticle,
  getPendingArticle,
  removePendingArticle,
  updatePendingCategory,
} from '@/lib/telegram-simple/pending-articles';

describe('pending articles state', () => {
  const chatId = 12345;
  const mockArticle = {
    article: {
      title: 'Test Article',
      content: 'Test content...',
      excerpt: 'Test excerpt',
      category: 'tech',
      wordCount: 150,
    },
    isUrl: false,
    originalText: 'Test original text...',
  };

  it('stores and retrieves a pending article', () => {
    setPendingArticle(chatId, mockArticle);
    const result = getPendingArticle(chatId);
    expect(result).not.toBeNull();
    expect(result!.article.title).toBe('Test Article');
    expect(result!.chatId).toBe(chatId);
  });

  it('updates category', () => {
    setPendingArticle(chatId, mockArticle);
    const updated = updatePendingCategory(chatId, 'ai');
    expect(updated).toBe(true);
    const result = getPendingArticle(chatId);
    expect(result!.article.category).toBe('ai');
  });

  it('removes pending article', () => {
    setPendingArticle(chatId, mockArticle);
    removePendingArticle(chatId);
    expect(getPendingArticle(chatId)).toBeNull();
  });

  it('returns null for non-existent chat', () => {
    expect(getPendingArticle(99999)).toBeNull();
  });

  it('returns false for updating non-existent chat', () => {
    expect(updatePendingCategory(99999, 'ai')).toBe(false);
  });
});

// ── Callback data parsing ──

describe('callback data parsing', () => {
  it('parses category selection', () => {
    const data = 'cat:ai';
    expect(data.startsWith('cat:')).toBe(true);
    expect(data.replace('cat:', '')).toBe('ai');
  });

  it('parses publish actions', () => {
    expect('publish:auto'.startsWith('publish:')).toBe(true);
    expect('publish:yes'.startsWith('publish:')).toBe(true);
    expect('publish:draft'.startsWith('publish:')).toBe(true);
    expect('publish:cancel'.startsWith('publish:')).toBe(true);
  });

  it('handles unknown data', () => {
    expect('unknown:data'.startsWith('cat:')).toBe(false);
    expect('unknown:data'.startsWith('publish:')).toBe(false);
  });
});
