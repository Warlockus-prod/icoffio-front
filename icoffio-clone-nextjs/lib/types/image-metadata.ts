/**
 * IMAGE METADATA TYPES v7.8.0
 * 
 * Типы для хранения метаданных изображений статей
 * Включает промпты, теги, источники и историю изменений
 * 
 * @version 7.8.0
 * @date 2025-10-30
 */

export type ImageSource = 'dalle' | 'unsplash' | 'custom' | 'placeholder';

export interface ImageMetadata {
  url: string;
  source: ImageSource;
  prompt?: string;              // Оригинальный промпт (для DALL-E или Unsplash query)
  unsplashTags?: string[];      // Теги для Unsplash поиска
  dallePrompt?: string;         // Детальный промпт для DALL-E
  keywords?: string[];          // Ключевые слова
  visualStyle?: string;         // Визуальный стиль
  colorPalette?: string;        // Цветовая палитра
  generatedAt?: string;         // Дата генерации (ISO string)
  generatedBy?: string;         // Метод генерации ('auto' | 'manual' | 'ai-smart')
  alt?: string;                 // Alt текст для изображения
  credits?: {                   // Авторство (для Unsplash)
    photographer?: string;
    photographerUrl?: string;
    unsplashUrl?: string;
  };
}

export interface ArticleImageMetadata {
  heroImage: ImageMetadata;               // Главное изображение (миниатюра)
  contentImages: ImageMetadata[];         // Изображения в контенте статьи
  smartPromptsUsed: boolean;              // Использовались ли умные промпты
  lastUpdated: string;                    // Последнее обновление метаданных
}

export interface ImageRegenerationRequest {
  articleId: string;
  imageType: 'hero' | 'content';          // Тип изображения
  imageIndex?: number;                    // Индекс (для content images)
  source: ImageSource;                    // Источник изображения
  customPrompt?: string;                  // Кастомный промпт от пользователя
  customTags?: string[];                  // Кастомные теги (для Unsplash)
  useSmartPrompts?: boolean;              // Использовать AI для генерации промптов
}

export interface ImageRegenerationResponse {
  success: boolean;
  newUrl?: string;
  metadata?: ImageMetadata;
  error?: string;
  cost?: number;                          // Стоимость (для DALL-E)
}

/**
 * Утилита для создания дефолтной метадаты изображения
 */
export function createDefaultImageMetadata(
  url: string,
  source: ImageSource = 'placeholder'
): ImageMetadata {
  return {
    url,
    source,
    generatedAt: new Date().toISOString(),
    generatedBy: 'auto',
    alt: 'Article image'
  };
}

/**
 * Утилита для создания дефолтной метадаты статьи
 */
export function createDefaultArticleImageMetadata(): ArticleImageMetadata {
  return {
    heroImage: createDefaultImageMetadata('https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop'),
    contentImages: [],
    smartPromptsUsed: false,
    lastUpdated: new Date().toISOString()
  };
}

