/**
 * HTML sanitizer for article content.
 *
 * Prevents stored-XSS in published_articles.content_en/content_pl by stripping
 * dangerous tags/attrs before INSERT. Uses isomorphic-dompurify so it works
 * both server-side (Node) and inside any client component.
 *
 * Allowed tags = the union of what marked() emits from our Markdown pipeline
 * + a few HTML tags GPT may produce (figure/figcaption/iframe-for-embeds-disabled).
 *
 * If you need to support new tags (e.g., <video>, <audio>), add them here
 * after auditing for XSS vectors.
 */

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  // Block
  'p', 'div', 'blockquote', 'pre', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  // Inline
  'a', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'kbd', 'mark', 'small', 'sub', 'sup', 'br', 'span',
  // Media (img only — no <video>/<audio>/<iframe> until we have explicit need)
  'img',
];

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id',
  'rel', 'target', 'loading', 'decoding',
  'colspan', 'rowspan',
  // Typography hints
  'lang', 'dir',
];

/**
 * Sanitize article HTML for safe storage and display.
 * @param dirty raw HTML (often output from marked() over GPT-produced Markdown)
 * @returns clean HTML with no scripts, no event handlers, no javascript: URLs
 */
export function sanitizeArticleHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Strict: drop comments, ignore unknown tags entirely instead of escaping
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Forbid javascript:, vbscript:, data: in href/src
    ADD_URI_SAFE_ATTR: [],
    // Ban form-related vectors outright
    FORBID_TAGS: ['form', 'input', 'button', 'select', 'textarea', 'option', 'meta', 'link', 'style', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
    // KEEP_CONTENT must stay TRUE (default). Setting false has a DOMPurify quirk:
    // when ALLOWED_TAGS is a whitelist, text nodes inside ALLOWED tags also get stripped.
    // KEEP_CONTENT=true is safe — text from `<script>foo</script>` becomes just `foo` (harmless,
    // browser doesn't execute orphan strings).
    KEEP_CONTENT: true,
  });
}

/**
 * Lighter sanitizer for short fields (title, excerpt, meta_description).
 * Strips ALL HTML — these fields should be plain text.
 */
export function sanitizePlainText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
}
