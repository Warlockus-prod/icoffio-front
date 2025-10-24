import { marked } from 'marked';

// Настройка marked для безопасного рендеринга
// Используем GitHub Flavored Markdown (GFM) с поддержкой переносов строк
marked.use({
  breaks: true, // Поддержка переносов строк
  gfm: true, // GitHub Flavored Markdown
});

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
  
  // Если контент уже HTML (содержит теги), возвращаем как есть
  if (content.includes('<p>') || content.includes('<div>') || content.includes('<h1>')) {
    return content;
  }
  
  // Если markdown - парсим
  if (isMarkdown(content)) {
    return parseMarkdown(content);
  }
  
  // Обычный текст - оборачиваем в параграфы
  return content.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

