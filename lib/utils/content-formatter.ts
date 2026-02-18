/**
 * 📝 CONTENT FORMATTER - icoffio v7.30.0
 * 
 * Centralized utility for formatting content to HTML
 * Used by unified-article-service and API routes
 * 
 * ELIMINATES DUPLICATION: Previously duplicated in:
 * - lib/unified-article-service.ts
 * - app/api/articles/route.ts
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normalize AI-generated text so it reads naturally and does not expose raw marker artifacts.
 *
 * Main fixes:
 * - Converts heading-like `**Section**` markers to markdown headings (`## Section`)
 * - Removes remaining `**...**` wrappers (keeps text)
 * - Rebuilds paragraph breaks for long one-block texts
 * - Cleans spacing around punctuation
 */
export function normalizeAiGeneratedText(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Skip normalization for clear HTML documents
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  let normalized = content.replace(/\r\n/g, '\n').trim();

  // Convert standalone/section-like bold markers to markdown headings.
  // Example: "... missing. **What’s the cost?** The startup ..."
  normalized = normalized.replace(/\*\*([^*\n]{6,100})\*\*/g, (_match, inner) => {
    const headingText = inner.trim();
    const words = headingText.split(/\s+/).filter(Boolean).length;
    const hasHeadingEnding = /[?!]$/.test(headingText);
    const looksLikeHeading =
      words >= 2 &&
      words <= 14 &&
      (hasHeadingEnding || words >= 4) &&
      /^[A-Za-z0-9À-ž"'“”‘’(]/.test(headingText) &&
      !/[,:;.]$/.test(headingText);

    if (!looksLikeHeading) {
      return headingText;
    }

    return `\n\n## ${headingText}\n\n`;
  });

  // Remove any remaining raw markdown bold wrappers
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, '$1');

  // If the article is one giant block, rebuild paragraphs for readability.
  const lineBreakCount = (normalized.match(/\n/g) || []).length;
  if (lineBreakCount < 2 && normalized.length > 500) {
    const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const sentences = (normalized.match(sentenceRegex) || [])
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length >= 4) {
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(sentences.slice(i, i + 2).join(' '));
      }
      normalized = paragraphs.join('\n\n');
    }
  }

  return normalized
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

/**
 * Clean short summary/excerpt text from markdown artifacts.
 * Keeps plain readable sentence-style text for cards, meta and previews.
 */
export function sanitizeExcerptText(content: string, maxLength: number = 160): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleaned = content.replace(/\r\n/g, '\n').trim();

  // Remove heading/list markers and markdown wrappers.
  cleaned = cleaned
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  cleaned = cleaned
    .replace(/\s{0,2}#{2,6}\s*(?=\S)/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'`«»„”]+|["'`«»„”]+$/g, '')
    .trim();

  if (!cleaned) {
    return '';
  }

  if (maxLength > 0 && cleaned.length > maxLength) {
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace).trim() + '...';
    }
    return truncated.trim() + '...';
  }

  return cleaned;
}

interface ArticleBodySanitizeOptions {
  language?: string;
  minParagraphs?: number;
  aggressive?: boolean;
  preserveMonetizationMarker?: boolean;
}

const PARSER_HARD_STOP_PATTERNS: RegExp[] = [
  /\b(spider'?s web|google discover)\b/i,
  /\bnajnowsze\d{1,2}[:.]\d{2}/i,
  /\b(aktualizacja|updated?)\s*:\s*\d{4}-\d{2}-\d{2}t/i,
  /\btagi\s*:/i,
];

const PARSER_INLINE_NOISE_PATTERNS: RegExp[] = [
  /\bREKLAMA\s*/g,
  /\bADVERTISEMENT\s*/gi,
  /\bADVERTISMENT\s*/gi,
  /\bSPONSORED\s*/gi,
  /\b(czytaj też|read also|read more|polecamy)\s*:?\s*/gi,
  /\b(aktualizacja|updated?)\s*:\s*\d{4}-\d{2}-\d{2}t[^\s]*/gi,
  /\bhttps?:\/\/[^\s)]+/gi,
  /\bwww\.[^\s)]+/gi,
  /\b\d{1,2}\s*[.:]\s*\d{2}\b/g,
];

const PARSER_ARTIFACT_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bREKLAMA\b/gi, weight: 4 },
  { pattern: /\bCzytaj też\b/gi, weight: 4 },
  { pattern: /\bRead also\b/gi, weight: 4 },
  { pattern: /\bAktualizacja\s*:/gi, weight: 5 },
  { pattern: /\bGoogle Discover\b/gi, weight: 3 },
  { pattern: /\bTagi\s*:/gi, weight: 3 },
  { pattern: /\b(?:\d{1,2}[:.]\d{2}\s*){3,}/g, weight: 4 },
  { pattern: /\bhttps?:\/\/[^\s)]+/gi, weight: 2 },
];

function countMatches(input: string, pattern: RegExp): number {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Estimate parser artifact severity score in article body.
 * Higher score means more likely that nav/news-ticker/ads leaked into article text.
 */
export function getParserArtifactScore(content: string): number {
  if (!content) return 0;

  return PARSER_ARTIFACT_PATTERNS.reduce((total, entry) => {
    return total + countMatches(content, entry.pattern) * entry.weight;
  }, 0);
}

/**
 * Quick boolean check for severe parser artifacts.
 */
export function hasSevereParserArtifacts(content: string, threshold: number = 14): boolean {
  return getParserArtifactScore(content) >= threshold;
}

/**
 * Remove parser artifacts from body content (ads markers, "read also" blocks, raw URLs,
 * update tickers, tag clouds). Keeps markdown-like structure for article rendering.
 */
export function sanitizeArticleBodyText(
  content: string,
  options: ArticleBodySanitizeOptions = {}
): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const minParagraphs = options.minParagraphs ?? 2;
  let normalized = normalizeAiGeneratedText(content)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!normalized) {
    return '';
  }

  const markerMatch = normalized.match(/<!--\s*ICOFFIO_MONETIZATION[\s\S]*?-->/i);
  const monetizationMarker =
    options.preserveMonetizationMarker === false ? '' : markerMatch?.[0]?.trim() || '';
  normalized = normalized.replace(/<!--\s*ICOFFIO_MONETIZATION[\s\S]*?-->/gi, '').trim();

  // Strip broken/empty markdown image refs: ![alt text]() or ![]()
  normalized = normalized.replace(/!\[[^\]]*\]\(\s*\)/g, '');

  const rawParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const cleanedParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();

  for (const rawParagraph of rawParagraphs) {
    const isHeading = /^#{1,6}\s+/.test(rawParagraph);
    let paragraph = rawParagraph;

    if (!isHeading && /(czytaj też|read also|read more|polecamy)/i.test(paragraph)) {
      // "Read also" blocks are recommendation widgets, not article body.
      continue;
    }

    // If obvious side-column/news-ticker section starts, drop the tail of the article.
    const shouldStop = PARSER_HARD_STOP_PATTERNS.some((pattern) => pattern.test(paragraph));
    if (shouldStop && cleanedParagraphs.length >= minParagraphs) {
      break;
    }

    for (const pattern of PARSER_INLINE_NOISE_PATTERNS) {
      paragraph = paragraph.replace(pattern, ' ');
    }

    paragraph = paragraph
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!paragraph) continue;

    const plain = paragraph.replace(/^#{1,6}\s+/, '').trim();
    if (!plain) continue;

    const words = plain
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ''))
      .filter(Boolean);

    const alphaChars = (plain.match(/[\p{L}]/gu) || []).length;
    const digitChars = (plain.match(/\d/g) || []).length;
    const digitRatio = digitChars / Math.max(alphaChars + digitChars, 1);
    const updateHits = countMatches(plain, /\b(aktualizacja|updated|najnowsze|tagi)\b/gi);
    const tickerLike = /(?:\d{1,2}[:.]\d{2}\s*){2,}/.test(plain);

    if (!isHeading && words.length < 6) continue;
    if (!isHeading && digitRatio > 0.35) continue;
    if (!isHeading && (updateHits >= 2 || tickerLike)) continue;

    const dedupeKey = plain
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

    if (!dedupeKey) continue;
    if (options.aggressive && seenParagraphs.has(dedupeKey)) continue;
    seenParagraphs.add(dedupeKey);

    cleanedParagraphs.push(paragraph);
  }

  const joined = cleanedParagraphs.join('\n\n').trim();
  if (!joined) {
    return '';
  }

  const cleanedBody = joined
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  if (monetizationMarker) {
    return `${monetizationMarker}\n\n${cleanedBody}`.trim();
  }

  return cleanedBody;
}

/**
 * Format plain text content to HTML with Markdown-like syntax support
 * 
 * Supported syntax:
 * - ## Header → <h2>Header</h2>
 * - ### Header → <h3>Header</h3>
 * - **bold** → <strong>bold</strong>
 * - *italic* → <em>italic</em>
 * - - item → <li>item</li> (in ul)
 * - 1. item → <li>item</li> (in ol)
 * - > quote → <blockquote>quote</blockquote>
 * - ``` code ``` → <pre><code>code</code></pre>
 * - [text](url) → <a href="url">text</a>
 * - Empty lines → paragraph breaks
 */
export function formatContentToHtml(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const normalizedContent = normalizeAiGeneratedText(content);
  
  return normalizedContent
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Lists (unordered)
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    
    // Lists (ordered)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Wrap consecutive <li> items in <ul>
    .replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>')
    
    // Double line breaks to paragraphs
    .replace(/\n\n+/g, '</p><p>')
    
    // Single line breaks within paragraphs
    .replace(/\n(?!<)/g, '<br/>')
    
    // Wrap in paragraph tags
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>')
    
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '');
}

/**
 * Convert content to plain text (strip HTML)
 * Useful for generating excerpts
 */
export function contentToPlainText(content: string): string {
  if (!content) return '';
  
  return content
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

/**
 * Generate excerpt from content
 * @param content - HTML or plain text content
 * @param maxLength - Maximum length of excerpt (default 160)
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  const plainText = sanitizeExcerptText(contentToPlainText(content), maxLength);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Find last space before maxLength
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Sanitize HTML to prevent XSS
 * Allows only safe tags
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  const allowedTags = ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 
    'blockquote', 'pre', 'code', 'a', 'img', 'div', 'span'];
  
  const allowedAttributes = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];

  const withoutDangerousBlocks = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');

  return withoutDangerousBlocks.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tag, attrs = '') => {
    const tagName = tag.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!allowedTags.includes(tagName)) {
      return '';
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    const safeAttrs: string[] = [];
    const attrRegex = /\s+([a-zA-Z0-9:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
    let attrMatch: RegExpExecArray | null = null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const name = String(attrMatch[1] || '').toLowerCase();
      const value = (attrMatch[3] || attrMatch[4] || attrMatch[5] || '').trim();
      const normalizedValue = value.replace(/\s+/g, '').toLowerCase();

      if (!allowedAttributes.includes(name)) continue;
      if (name.startsWith('on')) continue;
      if ((name === 'href' || name === 'src') && normalizedValue.startsWith('javascript:')) continue;
      if (name === 'src' && normalizedValue.startsWith('data:') && !normalizedValue.startsWith('data:image/')) continue;
      if (name === 'href' && normalizedValue.startsWith('data:')) continue;

      if (value) {
        const escapedValue = value
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        safeAttrs.push(`${name}="${escapedValue}"`);
      } else {
        safeAttrs.push(name);
      }
    }

    const suffix = match.endsWith('/>') ? ' /' : '';
    return `<${tagName}${safeAttrs.length > 0 ? ` ${safeAttrs.join(' ')}` : ''}${suffix}>`;
  });
}
