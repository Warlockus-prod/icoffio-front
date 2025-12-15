export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  author: {
    name: string;
    avatar?: string;
  };
  publishedAt: string;
  readingTime: number;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  locale: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  articlesCount: number;
  locale: string;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    locale: string;
    timestamp: string;
  };
}

export interface AdConfig {
  placeId: string;
  format: 'mobile-banner' | 'medium-rectangle' | 'large-mobile-banner' | 'interstitial';
  width: number;
  height: number;
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
}

export interface MobileAdFormats {
  'mobile-banner': { width: 320; height: 50 };
  'medium-rectangle': { width: 300; height: 250 };
  'large-mobile-banner': { width: 320; height: 100 };
  'interstitial': { width: 100; height: 100 }; // Percentage-based
}
















