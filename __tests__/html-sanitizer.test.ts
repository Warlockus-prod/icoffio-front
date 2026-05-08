/**
 * XSS regression tests — every common stored-XSS vector must be neutralized.
 * Critical: a regression here = exploitable XSS in published article content.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeArticleHtml, sanitizePlainText } from '../lib/utils/html-sanitizer';

describe('sanitizeArticleHtml — XSS vectors', () => {
  it('strips <script> tags entirely', () => {
    const out = sanitizeArticleHtml('<p>Hello</p><script>alert(1)</script><p>World</p>');
    expect(out).toContain('<p>Hello</p>');
    expect(out).toContain('<p>World</p>');
    expect(out).not.toMatch(/<script/i);
    // KEEP_CONTENT default is true → text "alert(1)" may remain as harmless plain text
  });

  it('removes inline event handlers from allowed tags', () => {
    const cases = [
      '<a href="https://x.com" onclick="alert(1)">link</a>',
      '<img src="x.jpg" onerror="alert(1)">',
      '<img src="x.jpg" onload="alert(1)">',
      '<p onmouseover="alert(1)">hover</p>',
      '<a href="x" onfocus="alert(1)">focus</a>',
    ];
    for (const html of cases) {
      const out = sanitizeArticleHtml(html);
      expect(out.toLowerCase()).not.toMatch(/on\w+=/);
    }
  });

  it('blocks javascript: URLs in href / src', () => {
    const cases = [
      '<a href="javascript:alert(1)">click</a>',
      '<a href="JaVaScRiPt:alert(1)">click</a>',
      '<a href="	javascript:alert(1)">click</a>', // tab-prefix bypass attempt
      '<img src="javascript:alert(1)">',
    ];
    for (const html of cases) {
      const out = sanitizeArticleHtml(html);
      expect(out.toLowerCase()).not.toContain('javascript:');
    }
  });

  it('strips form / iframe / object / embed (FORBID_TAGS)', () => {
    const cases = [
      '<form action="evil"><input name="x"></form>',
      '<iframe src="evil.com"></iframe>',
      '<object data="evil.swf"></object>',
      '<embed src="evil.swf">',
      '<button>Click</button>',
    ];
    for (const html of cases) {
      const out = sanitizeArticleHtml(html);
      expect(out.toLowerCase()).not.toMatch(/<form|<iframe|<object|<embed|<button|<input/);
    }
  });

  it('strips inline style attribute (FORBID_ATTR)', () => {
    const out = sanitizeArticleHtml('<p style="background:url(javascript:alert(1))">x</p>');
    expect(out).not.toContain('style=');
  });

  it('strips <style> and <link> tags', () => {
    const out = sanitizeArticleHtml('<style>body{display:none}</style><link rel="stylesheet" href="x">');
    expect(out.toLowerCase()).not.toMatch(/<style|<link/);
  });

  it('preserves valid article content (allowed tags + attrs)', () => {
    const html = '<h2>Title</h2><p>Para with <strong>bold</strong> and <em>italic</em>.</p>' +
      '<ul><li>One</li><li>Two</li></ul>' +
      '<a href="https://example.com" title="ext" rel="noopener">link</a>' +
      '<img src="https://images.unsplash.com/foo.jpg" alt="caption" loading="lazy">' +
      '<blockquote>Quote</blockquote><pre><code>code</code></pre>';
    const out = sanitizeArticleHtml(html);
    expect(out).toContain('<h2>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>italic</em>');
    expect(out).toContain('<li>One</li>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('alt="caption"');
    expect(out).toContain('<blockquote>');
    expect(out).toContain('<pre>');
    expect(out).toContain('<code>code</code>');
  });

  it('handles empty / null / non-string input gracefully', () => {
    expect(sanitizeArticleHtml('')).toBe('');
    // @ts-expect-error runtime guard
    expect(sanitizeArticleHtml(null)).toBe('');
    // @ts-expect-error runtime guard
    expect(sanitizeArticleHtml(undefined)).toBe('');
    // @ts-expect-error runtime guard
    expect(sanitizeArticleHtml(123)).toBe('');
  });

  it('blocks SVG-based vectors (svg + onload)', () => {
    const out = sanitizeArticleHtml('<svg/onload=alert(1)>');
    expect(out.toLowerCase()).not.toMatch(/onload|<svg/);
  });

  it('blocks data: URI on src (non-image)', () => {
    const out = sanitizeArticleHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(out.toLowerCase()).not.toContain('<script');
  });
});

describe('sanitizePlainText — strict no-HTML mode', () => {
  it('removes ALL tags but keeps text', () => {
    const out = sanitizePlainText('<b>Hello</b> <i>world</i><script>x</script>');
    expect(out).not.toContain('<');
    expect(out).toContain('Hello');
    expect(out).toContain('world');
  });

  it('handles empty / null', () => {
    expect(sanitizePlainText('')).toBe('');
    // @ts-expect-error runtime guard
    expect(sanitizePlainText(null)).toBe('');
  });
});
