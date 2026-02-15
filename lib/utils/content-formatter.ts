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
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  cleaned = cleaned
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
  
  // Simple tag filter (for production, use a proper HTML sanitizer like DOMPurify)
  return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // Filter attributes
      return match.replace(/\s+([a-z-]+)(?:="[^"]*")?/gi, (attrMatch, attr) => {
        return allowedAttributes.includes(attr.toLowerCase()) ? attrMatch : '';
      });
    }
    return ''; // Remove disallowed tags
  });
}
