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

