/**
 * ✅ ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С ДЛИННЫМИ SLUG'АМИ
 * 
 * Универсальная утилита для генерации безопасных slug'ов
 * Все функции генерации slug'ов должны использовать эту утилиту
 */

/**
 * Генерирует безопасный slug из заголовка
 * @param title - Заголовок для преобразования
 * @param maxLength - Максимальная длина slug'а (по умолчанию 50)
 * @returns Безопасный slug
 */
export function generateSafeSlug(title: string, maxLength: number = 50): string {
  if (!title || typeof title !== 'string') {
    return 'untitled';
  }

  return title
    .toLowerCase()
    .trim()
    // Убираем HTML теги если есть
    .replace(/<[^>]*>/g, '')
    // Убираем специальные символы, оставляем буквы, цифры, пробелы и дефисы
    .replace(/[^\w\s\u0400-\u04FF-]/g, '')
    // Заменяем множественные пробелы одинарными
    .replace(/\s+/g, ' ')
    // Пробелы в дефисы
    .replace(/\s+/g, '-')
    // Множественные дефисы в одинарные
    .replace(/-+/g, '-')
    // Убираем дефисы в начале/конце
    .replace(/^-+|-+$/g, '')
    // Ограничиваем длину
    .substring(0, maxLength)
    // Убираем дефис в конце если появился после обрезки
    .replace(/-+$/, '');
}

/**
 * Добавляет язык к slug'у
 * @param baseSlug - Базовый slug
 * @param language - Код языка (en, pl, de, etc.)
 * @param maxLength - Максимальная длина итогового slug'а
 * @returns Slug с языковым суффиксом
 */
export function addLanguageSuffix(baseSlug: string, language: string, maxLength: number = 50): string {
  const suffix = `-${language}`;
  const maxBaseLength = maxLength - suffix.length;
  
  // Обрезаем базовый slug если нужно
  const trimmedSlug = baseSlug.substring(0, maxBaseLength).replace(/-+$/, '');
  
  return `${trimmedSlug}${suffix}`;
}

/**
 * Валидирует slug на безопасность
 * @param slug - Slug для проверки
 * @returns true если slug безопасен
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Проверяем длину
  if (slug.length === 0 || slug.length > 100) {
    return false;
  }

  // Проверяем формат (только буквы, цифры, дефисы)
  if (!/^[a-zA-Z0-9\u0400-\u04FF-]+$/.test(slug)) {
    return false;
  }

  // Не должен начинаться или заканчиваться дефисом
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Не должен содержать множественные дефисы
  if (slug.includes('--')) {
    return false;
  }

  return true;
}

/**
 * Очищает HTML контент от потенциально опасных элементов
 * @param html - HTML контент
 * @returns Безопасный HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Убираем потенциально опасные теги и атрибуты
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
