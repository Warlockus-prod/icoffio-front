/**
 * Сервис для интеграции с WordPress
 * Публикация статей на всех языках через REST API
 */

import { locales } from './i18n';

interface WordPressArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  category: string;
  tags: string[];
  image: string;
  author: string;
  language: string;
  metaDescription?: string;
  seoTitle?: string;
  publishedAt: string;
}

interface WordPressCredentials {
  url: string;
  username: string;
  applicationPassword: string;
}

interface PublicationResult {
  language: string;
  success: boolean;
  postId?: number;
  url?: string;
  error?: string;
}

interface WordPressPost {
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
  };
  excerpt: {
    rendered: string;
    raw?: string;
  };
  slug: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  categories: number[];
  tags: number[];
  featured_media: number;
  meta: Record<string, any>;
  date?: string;
}

class WordPressService {
  private credentials: WordPressCredentials;
  private apiBase: string;

  constructor() {
    this.credentials = {
      url: process.env.WORDPRESS_API_URL || 'https://icoffio.com',
      username: process.env.WORDPRESS_USERNAME || '',
      applicationPassword: process.env.WORDPRESS_APP_PASSWORD || ''
    };
    this.apiBase = `${this.credentials.url}/wp-json/wp/v2`;
  }

  /**
   * Проверяет доступность WordPress API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/posts?per_page=1`);
      return response.ok;
    } catch (error) {
      console.error('WordPress availability check failed:', error);
      return false;
    }
  }

  /**
   * 🏥 Расширенная диагностика WordPress подключения
   */
  async getHealthStatus(): Promise<{
    available: boolean;
    authenticated: boolean;
    canCreatePosts: boolean;
    categoriesAvailable: boolean;
    details: {
      apiUrl: string;
      hasCredentials: boolean;
      lastError?: string;
    };
  }> {
    const result = {
      available: false,
      authenticated: false,
      canCreatePosts: false,
      categoriesAvailable: false,
      details: {
        apiUrl: this.apiBase,
        hasCredentials: !!(this.credentials.username && this.credentials.applicationPassword),
        lastError: undefined as string | undefined
      }
    };

    try {
      // 1. Проверка доступности API
      const apiCheck = await fetch(`${this.apiBase}/posts?per_page=1`);
      result.available = apiCheck.ok;
      
      if (!result.available) {
        result.details.lastError = `API недоступен: ${apiCheck.status} ${apiCheck.statusText}`;
        return result;
      }

      // 2. Проверка авторизации
      if (result.details.hasCredentials) {
        result.authenticated = await this.checkAuthentication();
        
        if (!result.authenticated) {
          result.details.lastError = 'Неверные учетные данные WordPress';
          return result;
        }

        // 3. Проверка прав на создание постов
        try {
          const testResponse = await fetch(`${this.apiBase}/posts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${this.credentials.username}:${this.credentials.applicationPassword}`).toString('base64')}`
            },
            body: JSON.stringify({
              title: 'Test Post (Will be deleted)',
              content: 'Test content',
              status: 'draft'
            })
          });
          
          if (testResponse.ok) {
            result.canCreatePosts = true;
            // Удаляем тестовый пост
            const testPost = await testResponse.json();
            await fetch(`${this.apiBase}/posts/${testPost.id}?force=true`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${this.credentials.username}:${this.credentials.applicationPassword}`).toString('base64')}`
              }
            });
          } else {
            result.details.lastError = `Нет прав на создание постов: ${testResponse.status}`;
          }
        } catch (error) {
          result.details.lastError = `Ошибка проверки прав: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
      }

      // 4. Проверка категорий
      try {
        const categoriesResponse = await fetch(`${this.apiBase}/categories?per_page=10`);
        result.categoriesAvailable = categoriesResponse.ok;
      } catch {
        result.categoriesAvailable = false;
      }

    } catch (error) {
      result.details.lastError = `Общая ошибка: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    return result;
  }

  /**
   * Проверяет авторизацию
   */
  async checkAuthentication(): Promise<boolean> {
    if (!this.credentials.username || !this.credentials.applicationPassword) {
      return false;
    }

    try {
      const response = await this.makeRequest('/users/me', 'GET');
      return response.ok;
    } catch (error) {
      console.error('WordPress authentication check failed:', error);
      return false;
    }
  }

  /**
   * Публикует статью на всех языках
   */
  async publishMultilingualArticle(article: WordPressArticle, translations: Record<string, any>): Promise<{
    success: boolean;
    results: PublicationResult[];
    summary: {
      published: number;
      failed: number;
      total: number;
    };
  }> {
    const results: PublicationResult[] = [];
    
    try {
      // Публикуем оригинальную статью (русскую)
      const originalResult = await this.publishSingleArticle({
        ...article,
        language: 'ru',
        slug: `${article.slug}-ru`
      });
      results.push(originalResult);

      // Публикуем переводы
      for (const locale of locales) {
        if (locale === 'en' && translations[locale]) {
          const translatedArticle = this.buildTranslatedArticle(article, translations[locale], locale);
          const result = await this.publishSingleArticle(translatedArticle);
          results.push(result);
        }
      }

      const published = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: published > 0,
        results,
        summary: {
          published,
          failed,
          total: results.length
        }
      };

    } catch (error) {
      console.error('Multilingual publication error:', error);
      return {
        success: false,
        results,
        summary: {
          published: 0,
          failed: results.length || 1,
          total: results.length || 1
        }
      };
    }
  }

  /**
   * Публикует одну статью
   */
  async publishSingleArticle(article: WordPressArticle): Promise<PublicationResult> {
    try {
      // 1. Загружаем изображение как медиафайл
      const mediaId = await this.uploadMedia(article.image, article.title);

      // 2. Получаем/создаем категории и теги
      const categoryId = await this.ensureCategory(article.category, article.language);
      const tagIds = await this.ensureTags(article.tags, article.language);

      // 3. Подготавливаем данные поста
      const postData: WordPressPost = {
        title: { rendered: article.title, raw: article.title },
        content: { rendered: this.formatContent(article.content), raw: this.formatContent(article.content) },
        excerpt: { rendered: article.excerpt, raw: article.excerpt },
        slug: article.slug,
        status: 'publish',
        categories: [categoryId],
        tags: tagIds,
        featured_media: mediaId,
        meta: this.buildPostMeta(article),
        date: article.publishedAt
      };

      // 4. Публикуем пост
      const response = await this.makeRequest('/posts', 'POST', postData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WordPress publish error: ${JSON.stringify(error)}`);
      }

      const publishedPost = await response.json();

      return {
        language: article.language,
        success: true,
        postId: publishedPost.id,
        url: publishedPost.link
      };

    } catch (error) {
      console.error(`Publication error for ${article.language}:`, error);
      return {
        language: article.language,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Обновляет существующую статью
   */
  async updateArticle(postId: number, article: Partial<WordPressArticle>): Promise<PublicationResult> {
    try {
      const updateData: Partial<WordPressPost> = {};

      if (article.title) updateData.title = { rendered: article.title, raw: article.title };
      if (article.content) updateData.content = { rendered: this.formatContent(article.content), raw: this.formatContent(article.content) };
      if (article.excerpt) updateData.excerpt = { rendered: article.excerpt, raw: article.excerpt };
      if (article.slug) updateData.slug = article.slug;

      const response = await this.makeRequest(`/posts/${postId}`, 'POST', updateData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WordPress update error: ${JSON.stringify(error)}`);
      }

      const updatedPost = await response.json();

      return {
        language: article.language || 'unknown',
        success: true,
        postId: updatedPost.id,
        url: updatedPost.link
      };

    } catch (error) {
      console.error('Article update error:', error);
      return {
        language: article.language || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Удаляет статью
   */
  async deleteArticle(postId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest(`/posts/${postId}`, 'DELETE');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WordPress delete error: ${JSON.stringify(error)}`);
      }

      return { success: true };

    } catch (error) {
      console.error('Article deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Получает список статей
   */
  async getArticles(params: {
    per_page?: number;
    page?: number;
    category?: string;
    search?: string;
    status?: string;
  } = {}): Promise<{
    success: boolean;
    articles: any[];
    pagination: {
      total: number;
      pages: number;
      current: number;
    };
    error?: string;
  }> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await this.makeRequest(`/posts?${searchParams.toString()}`, 'GET');

      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }

      const articles = await response.json();
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0');

      return {
        success: true,
        articles,
        pagination: {
          total: totalPosts,
          pages: totalPages,
          current: params.page || 1
        }
      };

    } catch (error) {
      console.error('Get articles error:', error);
      return {
        success: false,
        articles: [],
        pagination: { total: 0, pages: 0, current: 1 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Приватные методы

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<Response> {
    const url = `${this.apiBase}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Добавляем авторизацию для методов, требующих её
    if (method !== 'GET') {
      if (!this.credentials.username || !this.credentials.applicationPassword) {
        throw new Error('WordPress credentials not configured');
      }
      
      const auth = btoa(`${this.credentials.username}:${this.credentials.applicationPassword}`);
      headers.Authorization = `Basic ${auth}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    return response;
  }

  private async uploadMedia(imageUrl: string, title: string): Promise<number> {
    try {
      // Скачиваем изображение
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBlob = await imageResponse.blob();
      const fileName = `${this.generateSlug(title)}.jpg`;

      // Загружаем в WordPress
      const formData = new FormData();
      formData.append('file', imageBlob, fileName);
      formData.append('title', title);
      formData.append('alt_text', title);

      const auth = btoa(`${this.credentials.username}:${this.credentials.applicationPassword}`);
      const uploadResponse = await fetch(`${this.apiBase}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Media upload failed: ${uploadResponse.status}`);
      }

      const mediaData = await uploadResponse.json();
      return mediaData.id;

    } catch (error) {
      console.error('Media upload error:', error);
      // Возвращаем 0 если загрузка не удалась
      return 0;
    }
  }

  private async ensureCategory(categoryName: string, language: string): Promise<number> {
    try {
      // Ищем существующую категорию
      const searchResponse = await this.makeRequest(`/categories?search=${encodeURIComponent(categoryName)}`, 'GET');
      const categories = await searchResponse.json();

      if (categories.length > 0) {
        return categories[0].id;
      }

      // Создаем новую категорию
      const createResponse = await this.makeRequest('/categories', 'POST', {
        name: categoryName,
        slug: this.generateSlug(categoryName),
        description: `${categoryName} articles in ${language}`,
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create category');
      }

      const newCategory = await createResponse.json();
      return newCategory.id;

    } catch (error) {
      console.error('Category ensure error:', error);
      return 1; // Возвращаем ID категории по умолчанию
    }
  }

  private async ensureTags(tagNames: string[], language: string): Promise<number[]> {
    const tagIds: number[] = [];

    for (const tagName of tagNames) {
      try {
        // Ищем существующий тег
        const searchResponse = await this.makeRequest(`/tags?search=${encodeURIComponent(tagName)}`, 'GET');
        const tags = await searchResponse.json();

        if (tags.length > 0) {
          tagIds.push(tags[0].id);
          continue;
        }

        // Создаем новый тег
        const createResponse = await this.makeRequest('/tags', 'POST', {
          name: tagName,
          slug: this.generateSlug(tagName),
          description: `${tagName} tag in ${language}`,
        });

        if (createResponse.ok) {
          const newTag = await createResponse.json();
          tagIds.push(newTag.id);
        }

      } catch (error) {
        console.error(`Tag ensure error for ${tagName}:`, error);
      }
    }

    return tagIds;
  }

  private buildTranslatedArticle(original: WordPressArticle, translation: any, language: string): WordPressArticle {
    return {
      ...original,
      title: translation.title || original.title,
      content: translation.body || original.content,
      excerpt: translation.excerpt || original.excerpt,
      slug: `${translation.slug || original.slug}-${language}`,
      language,
    };
  }

  private formatContent(content: string): string {
    // Конвертируем простой текст в HTML с базовой разметкой
    return content
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => {
        // Простые заголовки (строки, начинающиеся с #)
        if (paragraph.startsWith('# ')) {
          return `<h2>${paragraph.substring(2)}</h2>`;
        }
        if (paragraph.startsWith('## ')) {
          return `<h3>${paragraph.substring(3)}</h3>`;
        }
        
        // Списки
        if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
          const items = paragraph.split('\n- ').map(item => item.startsWith('- ') ? item.substring(2) : item);
          const listItems = items.map(item => `<li>${item}</li>`).join('');
          return `<ul>${listItems}</ul>`;
        }

        // Обычные параграфы
        return `<p>${paragraph}</p>`;
      })
      .join('\n');
  }

  private buildPostMeta(article: WordPressArticle): Record<string, any> {
    return {
      _yoast_wpseo_metadesc: article.metaDescription || article.excerpt,
      _yoast_wpseo_title: article.seoTitle || article.title,
      _yoast_wpseo_canonical: '',
      _yoast_wpseo_focuskw: article.tags[0] || '',
      language: article.language,
      original_id: article.id,
      generated_by: 'n8n-automation',
      generation_date: new Date().toISOString(),
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s\u0400-\u04FF]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}

// Экспортируем синглтон сервиса
export const wordpressService = new WordPressService();


