/**
 * TELEGRAM SIMPLE - TYPE DEFINITIONS
 *
 * Простые типы для упрощенной системы
 */

export interface ProcessedArticle {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  wordCount: number;
  /** GPT-optimized Unsplash search phrase based on article content */
  imageSearchQuery?: string;
  /** GPT-optimized DALL-E prompt based on article content */
  imagePrompt?: string;
}

export interface PublishResult {
  success: boolean;
  en: {
    id: number;
    slug: string;
    url: string;
  };
  pl: {
    id: number;
    slug: string;
    url: string;
  };
  error?: string;
}

/** Image extracted from a source article HTML page */
export interface ExtractedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Where the image was found: "og", "content", "figure", "hero" */
  context?: string;
  /** Relevance score (higher = more likely to be useful) */
  score?: number;
}

export interface ParsedUrl {
  title: string;
  content: string;
  /** Images extracted from the source page */
  images?: ExtractedImage[];
}

/**
 * TELEGRAM SETTINGS v8.5.0
 */
export type ContentStyle =
  | 'journalistic'
  | 'keep_as_is'
  | 'seo_optimized'
  | 'academic'
  | 'casual'
  | 'technical';

export type ImagesSource = 'unsplash' | 'ai' | 'none';
export type InterfaceLanguage = 'ru' | 'en' | 'pl';

export interface TelegramSettings {
  chatId: number;
  contentStyle: ContentStyle;
  imagesCount: number; // 0-3
  imagesSource: ImagesSource;
  autoPublish: boolean;
  interfaceLanguage: InterfaceLanguage;
  combineUrlsAsSingle: boolean;
}
