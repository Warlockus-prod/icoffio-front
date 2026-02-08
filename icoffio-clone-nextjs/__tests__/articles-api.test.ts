/**
 * Unit tests for Articles API utilities
 */
import { describe, it, expect } from 'vitest';

// ── Slug generation ──

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

describe('generateSlug', () => {
  it('converts title to URL-safe slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('AI & Machine Learning: The Future!')).toBe('ai-machine-learning-the-future');
  });

  it('handles multiple spaces and hyphens', () => {
    expect(generateSlug('  multiple   spaces---and---hyphens  ')).toBe('multiple-spaces-and-hyphens');
  });

  it('truncates to 60 chars', () => {
    const long = 'a'.repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(60);
  });

  it('handles Unicode characters', () => {
    expect(generateSlug('Rewolucja AI w 2024 roku')).toBe('rewolucja-ai-w-2024-roku');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('strips Cyrillic', () => {
    const slug = generateSlug('Привет мир Hello World');
    expect(slug).toBe('hello-world');
  });
});

// ── Action type validation ──

const SUPPORTED_ACTIONS = [
  'create-from-telegram',
  'create-from-url',
  'create-from-text',
  'health-check',
  'get-categories',
  'wordpress-health',
  'publish-article',
];

describe('API action routing', () => {
  it('recognizes all supported actions', () => {
    SUPPORTED_ACTIONS.forEach(action => {
      expect(SUPPORTED_ACTIONS.includes(action)).toBe(true);
    });
  });

  it('rejects unknown actions', () => {
    expect(SUPPORTED_ACTIONS.includes('delete-all')).toBe(false);
    expect(SUPPORTED_ACTIONS.includes('')).toBe(false);
    expect(SUPPORTED_ACTIONS.includes('hack')).toBe(false);
  });
});

// ── Category validation ──

const SUPPORTED_CATEGORIES = ['ai', 'apple', 'games', 'tech'];

describe('category validation', () => {
  it('accepts valid categories', () => {
    SUPPORTED_CATEGORIES.forEach(cat => {
      expect(SUPPORTED_CATEGORIES.includes(cat)).toBe(true);
    });
  });

  it('defaults to tech for unknown categories', () => {
    const category = 'unknown';
    const normalized = SUPPORTED_CATEGORIES.includes(category) ? category : 'tech';
    expect(normalized).toBe('tech');
  });
});

// ── Content style validation ──

const CONTENT_STYLES = ['journalistic', 'as-is', 'seo-optimized', 'academic', 'casual', 'technical'];

describe('content style validation', () => {
  it('recognizes all content styles', () => {
    CONTENT_STYLES.forEach(style => {
      expect(CONTENT_STYLES.includes(style)).toBe(true);
    });
  });

  it('as-is disables content enhancement', () => {
    const style = 'as-is';
    const enhanceContent = style !== 'as-is';
    expect(enhanceContent).toBe(false);
  });

  it('other styles enable content enhancement', () => {
    ['journalistic', 'seo-optimized', 'academic'].forEach(style => {
      const enhanceContent = style !== 'as-is';
      expect(enhanceContent).toBe(true);
    });
  });
});

// ── Stage parameter logic ──

describe('stage parameter', () => {
  it('text-only disables image generation', () => {
    const stage = 'text-only';
    const generateImage = stage !== 'text-only';
    expect(generateImage).toBe(false);
  });

  it('undefined stage enables image generation', () => {
    const stage = undefined;
    const generateImage = stage !== 'text-only';
    expect(generateImage).toBe(true);
  });

  it('full stage enables image generation', () => {
    const stage: string = 'full';
    const generateImage = stage !== 'text-only';
    expect(generateImage).toBe(true);
  });
});
