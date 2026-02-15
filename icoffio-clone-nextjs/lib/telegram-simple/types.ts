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

export interface ParsedUrl {
  title: string;
  content: string;
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
