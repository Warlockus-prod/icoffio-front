import { marked } from 'marked';

// Настройка marked для безопасного рендеринга
// Используем GitHub Flavored Markdown (GFM) с поддержкой переносов строк
marked.use({
  breaks: true, // Поддержка переносов строк
  gfm: true, // GitHub Flavored Markdown
});

const INVALID_IMAGE_SRC_PATTERNS = [
  /^$/i,
  /^null$/i,
  /^undefined$/i,
  /^nan$/i,
  /\/photo-1(?:[/?]|$)/i,
];

function isInvalidImageSrc(src: string): boolean {
  const normalized = (src || '').trim();
  const isHttp = /^https?:\/\//i.test(normalized);
  const isRootRelative = normalized.startsWith('/');
  const isDataUrl = /^data:image\//i.test(normalized);
  if (!isHttp && !isRootRelative && !isDataUrl) return true;
  return INVALID_IMAGE_SRC_PATTERNS.some((pattern) => pattern.test(normalized));
}

function stripInvalidMarkdownImages(markdown: string): string {
  return markdown.replace(/!\[[^\]]*]\(([^)]+)\)/g, (full, rawUrl) => {
    const url = String(rawUrl || '').trim().replace(/^['"]|['"]$/g, '');
    return isInvalidImageSrc(url) ? '' : full;
  });
}

function sanitizeHtmlImages(html: string): string {
  const withoutInvalidImages = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = (match?.[1] || match?.[2] || match?.[3] || '').trim();
    if (isInvalidImageSrc(src)) return '';
    return tag;
  });

  // Убираем пустые абзацы после удаления битых изображений.
  return withoutInvalidImages.replace(/<p>\s*(?:<br\s*\/?>\s*)*<\/p>/gi, '');
}

/**
 * Конвертирует Markdown в HTML
 * Безопасно обрабатывает markdown контент и возвращает HTML
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  try {
    // Парсим markdown в HTML
    const html = marked.parse(markdown, { async: false }) as string;
    return html;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback: возвращаем исходный текст в <pre>
    return `<pre>${markdown}</pre>`;
  }
}

/**
 * Проверяет, является ли контент markdown или HTML
 */
export function isMarkdown(content: string): boolean {
  // Проверяем наличие markdown синтаксиса
  const markdownPatterns = [
    /^#{1,6}\s/m, // Заголовки
    /\*\*.*?\*\*/s, // Bold
    /\*.*?\*/s, // Italic
    /!\[.*?\]\(.*?\)/s, // Images
    /\[.*?\]\(.*?\)/s, // Links
    /^[-*+]\s/m, // Lists
    /^>\s/m, // Blockquotes
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Интеллектуальный рендеринг контента
 * Автоматически определяет формат и парсит если нужно
 */
export function renderContent(content: string): string {
  if (!content) return '';
  const cleanedInput = stripInvalidMarkdownImages(content);
  
  // Если контент уже HTML (содержит теги), возвращаем как есть
  if (cleanedInput.includes('<p>') || cleanedInput.includes('<div>') || cleanedInput.includes('<h1>')) {
    return sanitizeHtmlImages(cleanedInput);
  }
  
  // Если markdown - парсим
  if (isMarkdown(cleanedInput)) {
    return sanitizeHtmlImages(parseMarkdown(cleanedInput));
  }
  
  // Обычный текст - оборачиваем в параграфы
  return cleanedInput.split('\n\n').map(p => `<p>${p}</p>`).join('');
}
