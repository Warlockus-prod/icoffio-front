import {Article, Category, ApiResponse} from '../types';

const API_BASE_URL = 'https://app.icoffio.com/api';
const WORDPRESS_API_URL = 'https://app.icoffio.com/api/wordpress-articles';

class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ICoffio-Mobile-App/1.0',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Получить список статей
  async getArticles(
    page: number = 1, 
    locale: string = 'en',
    category?: string
  ): Promise<ApiResponse<Article[]>> {
    try {
      // Используем WordPress API для получения статей
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
        lang: locale,
        ...(category && { category }),
      });

      const response = await fetch(`${WORDPRESS_API_URL}?${params}`);
      const data = await response.json();

      // Преобразуем WordPress формат в наш формат
      const articles: Article[] = data.map((post: any) => ({
        id: post.id.toString(),
        slug: post.slug,
        title: post.title.rendered,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''), // Удаляем HTML теги
        content: post.content.rendered,
        featuredImage: {
          url: post.featured_image_url || '/placeholder-image.jpg',
          alt: post.title.rendered,
          width: 800,
          height: 450,
        },
        author: {
          name: post.author_name || 'ICoffio',
          avatar: post.author_avatar,
        },
        publishedAt: post.date,
        readingTime: this.calculateReadingTime(post.content.rendered),
        category: {
          id: post.categories?.[0]?.toString() || '1',
          name: post.category_names?.[0] || 'Technology',
          slug: post.category_slugs?.[0] || 'technology',
          color: '#007AFF',
        },
        tags: post.tags?.map((tag: any) => ({
          id: tag.id?.toString() || Math.random().toString(),
          name: tag.name || tag,
          slug: tag.slug || tag.toLowerCase().replace(/\s+/g, '-'),
        })) || [],
        locale,
        seo: {
          metaTitle: post.yoast_head_json?.title || post.title.rendered,
          metaDescription: post.yoast_head_json?.description || post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        },
      }));

      return {
        data: articles,
        pagination: {
          page,
          pageSize: 10,
          total: parseInt(response.headers.get('X-WP-Total') || '0'),
          totalPages: parseInt(response.headers.get('X-WP-TotalPages') || '1'),
        },
        meta: {
          locale,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  }

  // Получить одну статью по ID
  async getArticle(id: string, locale: string = 'en'): Promise<Article> {
    try {
      const response = await fetch(`${WORDPRESS_API_URL}/${id}?lang=${locale}`);
      const post = await response.json();

      return {
        id: post.id.toString(),
        slug: post.slug,
        title: post.title.rendered,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImage: {
          url: post.featured_image_url || '/placeholder-image.jpg',
          alt: post.title.rendered,
          width: 800,
          height: 450,
        },
        author: {
          name: post.author_name || 'ICoffio',
          avatar: post.author_avatar,
        },
        publishedAt: post.date,
        readingTime: this.calculateReadingTime(post.content.rendered),
        category: {
          id: post.categories?.[0]?.toString() || '1',
          name: post.category_names?.[0] || 'Technology',
          slug: post.category_slugs?.[0] || 'technology',
          color: '#007AFF',
        },
        tags: post.tags?.map((tag: any) => ({
          id: tag.id?.toString() || Math.random().toString(),
          name: tag.name || tag,
          slug: tag.slug || tag.toLowerCase().replace(/\s+/g, '-'),
        })) || [],
        locale,
        seo: {
          metaTitle: post.yoast_head_json?.title || post.title.rendered,
          metaDescription: post.yoast_head_json?.description || post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        },
      };
    } catch (error) {
      console.error('Error fetching article:', error);
      throw error;
    }
  }

  // Получить категории
  async getCategories(locale: string = 'en'): Promise<Category[]> {
    try {
      // Заглушка для категорий - можно расширить когда добавится API
      const categories: Category[] = [
        {
          id: '1',
          name: 'Technology',
          slug: 'technology',
          description: 'Latest in tech',
          color: '#007AFF',
          articlesCount: 25,
          locale,
        },
        {
          id: '2',
          name: 'Business',
          slug: 'business',
          description: 'Business insights',
          color: '#34C759',
          articlesCount: 18,
          locale,
        },
        {
          id: '3',
          name: 'Design',
          slug: 'design',
          description: 'Design trends',
          color: '#FF3B30',
          articlesCount: 12,
          locale,
        },
      ];

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Поиск статей
  async searchArticles(
    query: string, 
    locale: string = 'en'
  ): Promise<Article[]> {
    try {
      const params = new URLSearchParams({
        search: query,
        lang: locale,
        per_page: '20',
      });

      const response = await fetch(`${WORDPRESS_API_URL}?${params}`);
      const data = await response.json();

      return data.map((post: any) => ({
        id: post.id.toString(),
        slug: post.slug,
        title: post.title.rendered,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        content: post.content.rendered,
        featuredImage: {
          url: post.featured_image_url || '/placeholder-image.jpg',
          alt: post.title.rendered,
          width: 800,
          height: 450,
        },
        author: {
          name: post.author_name || 'ICoffio',
        },
        publishedAt: post.date,
        readingTime: this.calculateReadingTime(post.content.rendered),
        category: {
          id: post.categories?.[0]?.toString() || '1',
          name: post.category_names?.[0] || 'Technology',
          slug: post.category_slugs?.[0] || 'technology',
          color: '#007AFF',
        },
        tags: post.tags?.map((tag: any) => ({
          id: tag.id?.toString() || Math.random().toString(),
          name: tag.name || tag,
          slug: tag.slug || tag.toLowerCase().replace(/\s+/g, '-'),
        })) || [],
        locale,
        seo: {
          metaTitle: post.title.rendered,
          metaDescription: post.excerpt.rendered.replace(/<[^>]*>/g, ''),
        },
      }));
    } catch (error) {
      console.error('Error searching articles:', error);
      return [];
    }
  }

  // Вспомогательная функция для подсчета времени чтения
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const textContent = content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

export const apiService = new ApiService();
















