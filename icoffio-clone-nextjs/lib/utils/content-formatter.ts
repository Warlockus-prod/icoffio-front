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
  
  return content
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
  const plainText = contentToPlainText(content);
  
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

