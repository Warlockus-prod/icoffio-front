/**
 * 🖼️ IMAGE PLACER v8.4.0
 * 
 * Равномерная расстановка изображений по тексту статьи.
 * 
 * Логика:
 * - 1 изображение → только hero (не вставляется в контент)
 * - 2 изображения → hero + ~50% текста
 * - 3 изображения → hero + 33% + 66%
 * - 4 изображения → hero + 25% + 50% + 75%
 * - 5 изображений → hero + 20% + 40% + 60% + 80%
 * 
 * Изображения вставляются ПОСЛЕ абзацев, не разрывая текст.
 */

export interface ImagePlacementOptions {
  /** URL изображений (первое = hero, остальные вставляются в контент) */
  imageUrls: string[];
  /** Заголовок статьи (для alt текста) */
  title: string;
  /** Формат markdown или html */
  format?: 'markdown' | 'html';
}

export interface ImagePlacementResult {
  /** Контент с вставленными изображениями */
  contentWithImages: string;
  /** URL hero изображения (первое) */
  heroImage: string | null;
  /** Позиции вставленных изображений (в процентах) */
  placements: number[];
}

/**
 * Вставить изображения в контент равномерно
 */
export function placeImagesInContent(
  content: string,
  options: ImagePlacementOptions
): ImagePlacementResult {
  const { imageUrls, title, format = 'markdown' } = options;
  
  // Фильтруем пустые URL
  const validUrls = imageUrls.filter(url => url && url.trim().length > 0);
  
  if (validUrls.length === 0) {
    return {
      contentWithImages: content,
      heroImage: null,
      placements: []
    };
  }

  // Hero изображение - всегда первое
  const heroImage = validUrls[0];
  
  // Остальные изображения для вставки в контент
  const contentImages = validUrls.slice(1);
  
  // Если только hero - возвращаем контент без изменений
  if (contentImages.length === 0) {
    return {
      contentWithImages: content,
      heroImage,
      placements: []
    };
  }

  // Разбиваем контент на параграфы
  const paragraphs = splitIntoParagraphs(content);
  
  // Если слишком мало параграфов - не вставляем
  if (paragraphs.length < 3) {
    console.warn('[ImagePlacer] Not enough paragraphs for image insertion');
    return {
      contentWithImages: content,
      heroImage,
      placements: []
    };
  }

  // Рассчитываем позиции для вставки
  const positions = calculateImagePositions(contentImages.length, paragraphs.length);
  
  console.log(`[ImagePlacer] Placing ${contentImages.length} images at positions: ${positions.join(', ')}`);
  
  // Вставляем изображения (с конца, чтобы не сбивать индексы)
  const result = [...paragraphs];
  const placements: number[] = [];
  
  for (let i = contentImages.length - 1; i >= 0; i--) {
    const position = positions[i];
    const imageUrl = contentImages[i];
    const imageMarkup = createImageMarkup(imageUrl, title, i + 1, format);
    
    // Вставляем после параграфа
    result.splice(position + 1, 0, imageMarkup);
    placements.unshift(Math.round((position / paragraphs.length) * 100));
  }

  return {
    contentWithImages: result.join('\n\n'),
    heroImage,
    placements
  };
}

/**
 * Разбить контент на параграфы
 */
function splitIntoParagraphs(content: string): string[] {
  // Разбиваем по двойным переносам строки или по пустым строкам
  return content
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Рассчитать позиции для вставки изображений
 */
function calculateImagePositions(imageCount: number, paragraphCount: number): number[] {
  const positions: number[] = [];
  
  // Распределяем равномерно
  // imageCount = 1 → [50%]
  // imageCount = 2 → [33%, 66%]
  // imageCount = 3 → [25%, 50%, 75%]
  // imageCount = 4 → [20%, 40%, 60%, 80%]
  
  for (let i = 0; i < imageCount; i++) {
    // Позиция в процентах (избегаем самого начала и конца)
    const percent = (i + 1) / (imageCount + 1);
    // Индекс параграфа
    const position = Math.floor(percent * paragraphCount);
    // Убеждаемся что не выходим за границы и не в самом начале
    positions.push(Math.max(1, Math.min(position, paragraphCount - 2)));
  }
  
  return positions;
}

/**
 * Создать разметку для изображения
 */
function createImageMarkup(
  url: string, 
  title: string, 
  index: number,
  format: 'markdown' | 'html'
): string {
  const alt = index === 1 
    ? title 
    : `${title} - illustration ${index}`;
  
  if (format === 'html') {
    return `<figure class="article-image">
  <img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" />
  <figcaption>${escapeHtml(alt)}</figcaption>
</figure>`;
  }
  
  // Markdown по умолчанию
  return `![${alt}](${url})`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Preview: показать где будут вставлены изображения
 */
export function previewImagePlacements(
  content: string,
  imageCount: number
): { position: number; percent: number }[] {
  const paragraphs = splitIntoParagraphs(content);
  
  if (paragraphs.length < 3 || imageCount <= 1) {
    return [];
  }
  
  const positions = calculateImagePositions(imageCount - 1, paragraphs.length);
  
  return positions.map(pos => ({
    position: pos,
    percent: Math.round((pos / paragraphs.length) * 100)
  }));
}

