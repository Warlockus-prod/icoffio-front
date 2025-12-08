/**
 * 🧹 CONTENT CLEANER v8.6.6
 * 
 * Clean promotional and junk text from articles
 * Works for multiple languages (EN, PL, RU, DE, ES)
 */

// Promotional phrases to remove (all languages)
const PROMOTIONAL_PATTERNS = [
  // English
  /\n*(?:subscribe|follow us|join us|stay tuned|don't miss|get notified|sign up for|be the first|stay updated|stay connected|get the latest|join our community|become a member)[^\n]*$/gim,
  /\n*(?:share this|share on|tweet this|like us|follow on|connect with|find us on)[^\n]*$/gim,
  /\n*(?:related articles?|you might also like|recommended|see also|read more|continue reading)[^\n]*$/gim,
  /\n*(?:newsletter|subscribe to our|get our updates|weekly digest|daily updates)[^\n]*$/gim,
  /\n*(?:leave a comment|share your thoughts|what do you think|let us know)[^\n]*$/gim,
  /\n*(?:disclosure|sponsored|advertisement|ad|promoted|partner content)[^\n]*$/gim,
  /\n*(?:about the author|author bio|written by)[^\n]*$/gim,
  /\n*(?:tags?:|categories?:|filed under|posted in)[^\n]*$/gim,
  /\n*(?:copyright|all rights reserved|©)[^\n]*$/gim,
  
  // Russian
  /\n*(?:подписывайтесь|подпишитесь|подпишись|следите за|присоединяйтесь|будьте с нами|оставайтесь с нами)[^\n]*$/gim,
  /\n*(?:поделитесь|поделиться|отправить|репост|лайк|нравится)[^\n]*$/gim,
  /\n*(?:читайте также|похожие статьи|вам может понравиться|рекомендуем|смотрите также)[^\n]*$/gim,
  /\n*(?:рассылка|новостная рассылка|получайте новости)[^\n]*$/gim,
  /\n*(?:оставьте комментарий|напишите нам|ваше мнение|что думаете)[^\n]*$/gim,
  /\n*(?:об авторе|автор статьи|написал)[^\n]*$/gim,
  /\n*(?:теги|категории|рубрики)[^\n]*$/gim,
  /\n*(?:источник|source)[^\n]*$/gim,
  
  // Polish
  /\n*(?:subskrybuj|zapisz się|śledź nas|dołącz do nas|bądź na bieżąco|zostań z nami)[^\n]*$/gim,
  /\n*(?:udostępnij|podziel się|polub nas|obserwuj nas)[^\n]*$/gim,
  /\n*(?:przeczytaj również|podobne artykuły|polecamy|zobacz także)[^\n]*$/gim,
  /\n*(?:newsletter|biuletyn|otrzymuj nowości)[^\n]*$/gim,
  /\n*(?:zostaw komentarz|napisz do nas|co myślisz)[^\n]*$/gim,
  /\n*(?:o autorze|autor artykułu)[^\n]*$/gim,
  /\n*(?:tagi|kategorie)[^\n]*$/gim,
  /\n*(?:źródło)[^\n]*$/gim,
  
  // German
  /\n*(?:abonnieren|folgen sie uns|bleiben sie dran|verpassen sie nicht)[^\n]*$/gim,
  /\n*(?:teilen|gefällt mir|folgen auf)[^\n]*$/gim,
  /\n*(?:ähnliche artikel|das könnte sie interessieren|mehr lesen)[^\n]*$/gim,
  
  // Spanish
  /\n*(?:suscríbete|síguenos|únete|mantente informado)[^\n]*$/gim,
  /\n*(?:compartir|me gusta|seguir en)[^\n]*$/gim,
  /\n*(?:artículos relacionados|también te puede gustar|lee más)[^\n]*$/gim,
];

// Social media links patterns
const SOCIAL_PATTERNS = [
  /\n*(?:twitter|facebook|instagram|linkedin|youtube|tiktok|telegram|whatsapp)(?:\.com)?[^\n]*$/gim,
  /\n*@\w+[^\n]*$/gim, // Social handles at end
  /\n*(?:t\.me|fb\.com|vk\.com|wa\.me)[^\n]*$/gim,
];

/**
 * Clean article content - remove promotional text
 */
export function cleanArticleContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // 1. Remove promotional phrases (from end of article)
  for (const pattern of PROMOTIONAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // 2. Remove social media patterns
  for (const pattern of SOCIAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // 3. Remove "Source: ..." lines at the very end
  cleaned = cleaned.replace(/\n{1,}(?:Source|Источник|Źródło|Quelle):\s*[^\n]+\s*$/im, '');
  
  // 4. Remove empty lines at end
  cleaned = cleaned.replace(/\n{2,}$/g, '\n');
  
  // 5. Normalize excessive line breaks (max 2)
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
