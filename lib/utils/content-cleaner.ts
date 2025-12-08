/**
 * 🧹 CONTENT CLEANER v8.6.4
 * 
 * Global utility for cleaning article content from:
 * - Orphan hash symbols (#)
 * - Source/Источник lines at the end
 * - Broken markdown formatting
 * - Excessive whitespace
 */

/**
 * Clean article content from junk patterns
 */
export function cleanArticleContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // 1. Remove "Source: ..." lines at the end (multiple languages)
  cleaned = cleaned.replace(/\n*(?:Source|Источник|Źródło|Quelle|Sursă|Zdroj):\s*.+$/gim, '');
  
  // 2. Fix orphan hash symbols (# not followed by space and text = heading)
  // Keep proper markdown headings like "## Title" but remove lone "#" or "# " without content
  cleaned = cleaned.replace(/^#\s*$/gm, ''); // Lines with just #
  cleaned = cleaned.replace(/(?<![#\w])#(?![#\s\w])/g, ''); // Orphan # in middle of text
  
  // 3. Remove excessive hashes (more than 6 is never valid markdown)
  cleaned = cleaned.replace(/#{7,}/g, '######');
  
  // 4. Fix heading formatting (ensure space after #)
  cleaned = cleaned.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  
  // 5. Remove empty markdown headings
  cleaned = cleaned.replace(/^#{1,6}\s*$/gm, '');
  
  // 6. Normalize line breaks (max 2 consecutive)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  cleaned = cleaned.replace(/\n{3}/g, '\n\n');
  
  // 7. Remove trailing/leading whitespace from lines
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // 8. Remove common junk patterns
  const junkPatterns = [
    /\[Image\]/gi,
    /\[Photo\]/gi,
    /\[Video\]/gi,
    /Read more\.{3}$/gim,
    /Continue reading\.{3}$/gim,
    /Subscribe to our newsletter/gi,
    /Sign up for updates/gi,
    /Share this article/gi,
    /Follow us on/gi,
  ];
  
  junkPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // 9. Final cleanup
  cleaned = cleaned.replace(/\s{3,}/g, '  ');
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Generate a proper SEO excerpt (max 160 chars, no truncated sentences)
 */
export function generateSEOExcerpt(content: string, maxLength: number = 160): string {
  if (!content) return '';
  
  // Clean the content first
  let text = cleanArticleContent(content);
  
  // Remove markdown formatting
  text = text
    .replace(/^#{1,6}\s+/gm, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/`(.+?)`/g, '$1') // Code
    .replace(/\n+/g, ' ') // Line breaks to spaces
    .replace(/\s+/g, ' ') // Multiple spaces
    .trim();
  
  // If already short enough, return as is
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find last complete sentence within limit
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let excerpt = '';
  
  for (const sentence of sentences) {
    if ((excerpt + sentence).length <= maxLength) {
      excerpt += sentence;
    } else {
      break;
    }
  }
  
  // If no complete sentences fit, take first sentence (even if longer) or truncate smartly
  if (!excerpt && sentences.length > 0) {
    excerpt = sentences[0] || '';
    if (excerpt && excerpt.length > maxLength) {
      // Find last word boundary before maxLength
      const truncated = excerpt.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.7) {
        excerpt = truncated.substring(0, lastSpace) + '...';
      } else {
        excerpt = truncated + '...';
      }
    }
  } else if (!excerpt) {
    // Fallback: just truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      excerpt = truncated.substring(0, lastSpace) + '...';
    } else {
      excerpt = truncated + '...';
    }
  }
  
  return excerpt.trim();
}

/**
 * Clean title from quotes and special characters
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/^["'«»„"]+/, '') // Leading quotes
    .replace(/["'«»„"]+$/, '') // Trailing quotes
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  cleanArticleContent,
  generateSEOExcerpt,
  cleanTitle
};

