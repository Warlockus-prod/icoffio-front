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
 * Uses 'marked' library for robust parsing
 */
import { marked } from 'marked';

export function formatContentToHtml(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  try {
    // Configure marked to handle line breaks correctly
    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Parse markdown to HTML
    // marked can return Promise if async options are used, but by default it's synchronous
    // We cast to string because we aren't using async highlighting
    const html = marked.parse(content) as string;
    
    return html;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // Fallback to simple replacement if marked fails
    return content
      .replace(/\n/g, '<br/>');
  }
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

