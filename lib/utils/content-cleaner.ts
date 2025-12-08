/**
 * 🧹 CONTENT CLEANER v8.6.5
 * 
 * CONSERVATIVE content cleaning utility
 * Only removes obvious junk, preserves all valid content
 */

/**
 * Clean article content - CONSERVATIVE approach
 * Only removes clearly unwanted patterns
 */
export function cleanArticleContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // 1. Remove "Source: ..." lines ONLY at the very end
  cleaned = cleaned.replace(/\n{2,}(?:Source|Источник|Źródło):\s*[^\n]+\s*$/im, '');
  
  // 2. Remove empty lines with just whitespace
  cleaned = cleaned.replace(/^\s+$/gm, '');
  
  // 3. Normalize excessive line breaks (max 2)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Generate SEO-friendly excerpt (max 160 chars, complete sentences)
 */
export function generateSEOExcerpt(content: string, maxLength: number = 160): string {
  if (!content) return '';
  
  // Strip markdown
  let text = content
    .replace(/^#{1,6}\s+/gm, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/`(.+?)`/g, '$1') // Code
    .replace(/\n+/g, ' ') // Line breaks to spaces
    .replace(/\s+/g, ' ') // Multiple spaces
    .trim();
  
  if (text.length <= maxLength) return text;
  
  // Find last complete sentence within limit
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let excerpt = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if ((excerpt + ' ' + trimmedSentence).trim().length <= maxLength) {
      excerpt = (excerpt + ' ' + trimmedSentence).trim();
    } else {
      break;
    }
  }
  
  // If no complete sentences fit, truncate at word boundary
  if (!excerpt) {
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      excerpt = truncated.substring(0, lastSpace) + '...';
    } else {
      excerpt = truncated + '...';
    }
  }
  
  return excerpt;
}

/**
 * Clean title from unwanted quotes (conservative)
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/^[«»„"]+/, '') // Leading quotes only
    .replace(/[«»„"]+$/, '') // Trailing quotes only
    .trim();
}

export default {
  cleanArticleContent,
  generateSEOExcerpt,
  cleanTitle
};
