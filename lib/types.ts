/**
 * 📝 TYPE DEFINITIONS - icoffio v7.30.0
 * 
 * Centralized type definitions for the application
 * Improved typing to reduce use of 'any'
 */

// ========== BASE TYPES ==========

export type Category = { 
  name: string; 
  slug: string;
  description?: string;
};

export type Tag = { 
  name: string; 
  slug: string; 
};

// ========== POST/ARTICLE TYPES ==========

export type Post = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  date?: string;
  publishedAt?: string;
  image: string;
  imageAlt?: string;
  category: Category;
  tags?: Tag[];
  content?: string;
  contentHtml?: string;
  images?: string[];
  author?: string;
  language?: SupportedLanguage;
  views?: number;
  readingTime?: number;
  sourceUrl?: string;
};

// Article with required content (for full article pages)
export type FullArticle = Post & {
  content: string;
  contentHtml: string;
};

// Article card (for listings, minimal data)
export type ArticleCard = Pick<Post, 'slug' | 'title' | 'excerpt' | 'image' | 'imageAlt' | 'category' | 'publishedAt'>;

// ========== LANGUAGE TYPES ==========

export type SupportedLanguage = 'en' | 'pl' | 'de' | 'ro' | 'cs' | 'ru';
export type ActiveLanguage = 'en' | 'pl'; // Languages actively supported in production

export const ACTIVE_LANGUAGES: ActiveLanguage[] = ['en', 'pl'];
export const ALL_SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'pl', 'de', 'ro', 'cs', 'ru'];

// ========== API TYPES ==========

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========== ADMIN TYPES ==========

export type AdminTab = 
  | 'dashboard' 
  | 'parser' 
  | 'articles' 
  | 'editor' 
  | 'queue' 
  | 'images' 
  | 'advertising'
  | 'content-prompts'
  | 'logs' 
  | 'settings';

export interface AdminStatistics {
  urlsAddedToday: number;
  urlsAddedWeek: number;
  urlsAddedMonth: number;
  successfullyParsed: number;
  publishedArticles: number;
  failedParses: number;
  averageProcessingTime: number;
  recentActivity: AdminActivityLog[];
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  type: 'url_added' | 'article_parsed' | 'article_published' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

// ========== ARTICLE PROCESSING TYPES ==========

export type ProcessingStage = 
  | 'initial'        // Just added, not processed
  | 'parsing'        // URL being parsed
  | 'enhancing'      // Content being enhanced by AI
  | 'translating'    // Being translated
  | 'image-selection' // Waiting for image selection
  | 'ready'          // Ready for publication
  | 'published'      // Published
  | 'failed';        // Processing failed

export interface ImageOption {
  url: string;
  alt: string;
  source: 'unsplash' | 'ai' | 'original' | 'custom';
  query?: string;
}

export interface ProcessedArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  language: SupportedLanguage;
  slug: string;
  image?: string;
  imageAlt?: string;
  imageOptions?: ImageOption[];
  author?: string;
  tags?: string[];
  translations?: Record<SupportedLanguage, {
    title: string;
    content: string;
    excerpt: string;
    slug: string;
  }>;
  processingStage: ProcessingStage;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== ADVERTISING TYPES ==========

export type AdFormat = 
  | '728x90'   // Leaderboard (desktop)
  | '970x250'  // Billboard (desktop)
  | '300x250'  // Medium Rectangle
  | '300x600'  // Half Page
  | '320x50'   // Mobile Banner
  | '320x100'  // Large Mobile Banner
  | '320x480'  // Mobile Interstitial
  | '160x600'; // Wide Skyscraper

export type AdDevice = 'desktop' | 'mobile' | 'all';
export type AdPosition = 'content-top' | 'content-middle' | 'content-bottom' | 'sidebar-top' | 'sidebar-bottom' | 'footer';
export type AdLocation = 'homepage' | 'article' | 'category' | 'all';

export interface AdPlacement {
  id: string;
  placeId: string;
  format: AdFormat;
  placement: string;
  position: AdPosition;
  location: AdLocation;
  device: AdDevice;
  enabled: boolean;
  priority: number;
}

// ========== COOKIE CONSENT TYPES ==========

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
}

export interface CookieConsent {
  hasConsented: boolean;
  preferences: CookiePreferences;
  timestamp: string;
}

// ========== UTILITY TYPES ==========

// Make all properties of T optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make specific properties required
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Omit multiple keys
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
