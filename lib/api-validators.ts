/**
 * ✅ API ВАЛИДАТОРЫ ДЛЯ ICOFFIO v1.4.0
 * 
 * Предотвращают создание статей с проблемными slug'ами
 */

import { generateSafeSlug, validateSlug } from './slug-utils';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedSlug?: string;
}

/**
 * Валидирует данные статьи перед созданием
 */
export function validateArticleData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let correctedSlug: string | undefined;

  // Проверка заголовка
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Заголовок статьи обязателен');
  } else {
    if (data.title.length > 200) {
      errors.push('Заголовок слишком длинный (максимум 200 символов)');
    }
    if (data.title.length < 3) {
      errors.push('Заголовок слишком короткий (минимум 3 символа)');
    }
  }

  // Проверка контента
  if (!data.content || typeof data.content !== 'string') {
    errors.push('Контент статьи обязателен');
  } else {
    if (data.content.length < 50) {
      warnings.push('Контент кажется слишком коротким для качественной статьи');
    }
  }

  // Критическая проверка slug'а
  if (data.title) {
    const generatedSlug = generateSafeSlug(data.title, 45);
    const withLanguage = `${generatedSlug}-en`; // Базовый тест с английским
    
    if (!validateSlug(withLanguage)) {
      errors.push('Невозможно создать валидный slug из заголовка');
    } else if (withLanguage.length > 50) {
      warnings.push(`Slug будет обрезан: ${withLanguage.length} → 50 символов`);
      correctedSlug = withLanguage.substring(0, 47) + '-en';
    } else {
      correctedSlug = withLanguage;
    }
  }

  // Проверка языка
  const supportedLanguages = ['en', 'pl', 'de', 'ro', 'cs'];
  if (data.language && !supportedLanguages.includes(data.language)) {
    errors.push(`Неподдерживаемый язык: ${data.language}. Доступны: ${supportedLanguages.join(', ')}`);
  }

  // Проверка на русский контент (должен быть исключен)
  if (data.title && /[а-яё]/i.test(data.title)) {
    errors.push('Русский язык больше не поддерживается. Используйте английский или польский.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    correctedSlug
  };
}

/**
 * Мониторинг качества slug'ов
 */
export function generateSlugQualityReport(articles: any[]): {
  totalArticles: number;
  longSlugs: number;
  invalidSlugs: number;
  averageLength: number;
  recommendations: string[];
} {
  let totalLength = 0;
  let longSlugs = 0;
  let invalidSlugs = 0;
  const recommendations: string[] = [];

  for (const article of articles) {
    if (article.slug) {
      totalLength += article.slug.length;
      
      if (article.slug.length > 50) {
        longSlugs++;
      }
      
      if (!validateSlug(article.slug)) {
        invalidSlugs++;
      }
    }
  }

  const averageLength = articles.length > 0 ? Math.round(totalLength / articles.length) : 0;

  // Генерация рекомендаций
  if (longSlugs > 0) {
    recommendations.push(`Найдено ${longSlugs} статей с длинными slug'ами (>50 символов)`);
  }
  
  if (invalidSlugs > 0) {
    recommendations.push(`Найдено ${invalidSlugs} статей с невалидными slug'ами`);
  }
  
  if (averageLength > 40) {
    recommendations.push('Средняя длина slug\'ов высокая. Рекомендуется сокращение заголовков');
  }

  if (recommendations.length === 0) {
    recommendations.push('Качество slug\'ов отличное! Продолжайте в том же духе.');
  }

  return {
    totalArticles: articles.length,
    longSlugs,
    invalidSlugs,
    averageLength,
    recommendations
  };
}

/**
 * Автоматическое исправление проблемных slug'ов
 */
export function fixProblematicSlug(originalSlug: string, title: string): {
  fixedSlug: string;
  wasFixed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let fixedSlug = originalSlug;
  let wasFixed = false;

  // Проверка длины
  if (originalSlug.length > 50) {
    issues.push(`Длина slug: ${originalSlug.length} > 50`);
    
    // Попытка извлечь язык из конца
    const languageMatch = originalSlug.match(/-([a-z]{2})$/);
    const language = languageMatch ? languageMatch[1] : 'en';
    
    // Пересоздаем slug из заголовка
    const regeneratedSlug = generateSafeSlug(title, 45) + `-${language}`;
    fixedSlug = regeneratedSlug;
    wasFixed = true;
    
    issues.push(`Исправлено: ${fixedSlug} (${fixedSlug.length} символов)`);
  }

  // Проверка валидности
  if (!validateSlug(fixedSlug)) {
    issues.push('Slug не прошел валидацию');
    
    // Попытка очистки
    fixedSlug = fixedSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    wasFixed = true;
    issues.push(`Очищен: ${fixedSlug}`);
  }

  return {
    fixedSlug,
    wasFixed,
    issues
  };
}
