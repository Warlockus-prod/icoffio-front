/**
 * Сервис для генерации и получения изображений
 * Поддерживает OpenAI DALL-E, Unsplash API и локальные изображения
 */

interface ImageRequest {
  title: string;
  category: 'ai' | 'apple' | 'games' | 'tech';
  description?: string;
  style?: 'realistic' | 'modern' | 'minimalist' | 'tech' | 'futuristic';
  preferredSource?: 'dalle' | 'unsplash' | 'auto';
  dimensions?: {
    width: number;
    height: number;
  };
}

interface ImageResult {
  url: string;
  source: 'dalle' | 'unsplash' | 'placeholder';
  metadata: {
    title: string;
    description?: string;
    photographer?: string;
    unsplashId?: string;
    generatedPrompt?: string;
    dimensions: {
      width: number;
      height: number;
    };
  };
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  description?: string;
  alt_description?: string;
  width: number;
  height: number;
}

class ImageService {
  private openaiApiKey: string | undefined;
  private unsplashApiKey: string | undefined;
  private baseUrls = {
    openai: 'https://api.openai.com/v1',
    unsplash: 'https://api.unsplash.com'
  };

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  /**
   * Проверяет доступность сервисов
   */
  getAvailability() {
    return {
      dalle: !!this.openaiApiKey,
      unsplash: !!this.unsplashApiKey,
      anyService: !!(this.openaiApiKey || this.unsplashApiKey)
    };
  }

  /**
   * Основная функция получения изображения
   */
  async getImage(request: ImageRequest): Promise<ImageResult> {
    const availability = this.getAvailability();

    try {
      // Определяем стратегию получения изображения
      const source = this.determineImageSource(request.preferredSource, availability);

      switch (source) {
        case 'unsplash':
          return await this.getUnsplashImage(request);
        
        case 'dalle':
          return await this.generateDALLEImage(request);
        
        default:
          return this.getPlaceholderImage(request);
      }

    } catch (error) {
      console.error('Image service error:', error);
      return this.getPlaceholderImage(request);
    }
  }

  /**
   * Генерация изображения через DALL-E
   */
  async generateDALLEImage(request: ImageRequest): Promise<ImageResult> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key не настроен');
    }

    try {
      const prompt = this.buildDALLEPrompt(request);
      const size = this.getDALLESize(request.dimensions);

      const response = await fetch(`${this.baseUrls.openai}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size,
          quality: 'standard',
          style: 'natural'
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`DALL-E API error: ${response.status} ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;

      return {
        url: imageUrl,
        source: 'dalle',
        metadata: {
          title: request.title,
          description: request.description,
          generatedPrompt: prompt,
          dimensions: this.parseSizeToDimensions(size)
        }
      };

    } catch (error) {
      console.error('DALL-E generation error:', error);
      throw error;
    }
  }

  /**
   * Получение изображения с Unsplash
   */
  async getUnsplashImage(request: ImageRequest): Promise<ImageResult> {
    if (!this.unsplashApiKey) {
      throw new Error('Unsplash API key не настроен');
    }

    try {
      const searchQuery = this.buildUnsplashQuery(request);
      const response = await fetch(
        `${this.baseUrls.unsplash}/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10&orientation=landscape&category=technology`,
        {
          headers: {
            'Authorization': `Client-ID ${this.unsplashApiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Изображения не найдены на Unsplash');
      }

      // Выбираем лучшее изображение (первое из результатов)
      const photo: UnsplashPhoto = data.results[0];

      // Уведомляем Unsplash о скачивании (требование API)
      await this.trackUnsplashDownload(photo.id);

      return {
        url: photo.urls.regular,
        source: 'unsplash',
        metadata: {
          title: request.title,
          description: photo.description || photo.alt_description,
          photographer: photo.user.name,
          unsplashId: photo.id,
          dimensions: {
            width: photo.width,
            height: photo.height
          }
        }
      };

    } catch (error) {
      console.error('Unsplash error:', error);
      throw error;
    }
  }

  /**
   * Получение коллекции изображений по теме
   */
  async getImageCollection(category: string, count: number = 5): Promise<ImageResult[]> {
    if (!this.unsplashApiKey) {
      return Array(count).fill(null).map((_, i) => 
        this.getPlaceholderImage({ 
          title: `Image ${i + 1}`, 
          category: category as any 
        })
      );
    }

    try {
      const query = this.getCategoryQuery(category);
      const response = await fetch(
        `${this.baseUrls.unsplash}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.unsplashApiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash collection error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results.map((photo: UnsplashPhoto) => ({
        url: photo.urls.regular,
        source: 'unsplash' as const,
        metadata: {
          title: photo.description || `${category} image`,
          description: photo.alt_description,
          photographer: photo.user.name,
          unsplashId: photo.id,
          dimensions: {
            width: photo.width,
            height: photo.height
          }
        }
      }));

    } catch (error) {
      console.error('Image collection error:', error);
      // Возвращаем placeholder'ы в случае ошибки
      return Array(count).fill(null).map((_, i) => 
        this.getPlaceholderImage({ 
          title: `Image ${i + 1}`, 
          category: category as any 
        })
      );
    }
  }

  /**
   * Оптимизация изображения (изменение размера, качества)
   */
  async optimizeImage(imageUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }): Promise<string> {
    // Для Unsplash изображений можем использовать их параметры URL
    if (imageUrl.includes('unsplash.com')) {
      return this.optimizeUnsplashImage(imageUrl, options);
    }

    // Для других изображений возвращаем оригинал
    return imageUrl;
  }

  /**
   * Получение тематических изображений для категорий
   */
  getCategoryImages() {
    return {
      ai: {
        unsplashQueries: ['artificial intelligence', 'machine learning', 'neural networks', 'AI technology', 'robotics'],
        dallePrompts: ['Modern AI interface with neural network visualization', 'Futuristic artificial intelligence concept']
      },
      apple: {
        unsplashQueries: ['apple products', 'iphone', 'mac', 'ios', 'apple technology'],
        dallePrompts: ['Sleek Apple product design', 'Modern Apple device in minimalist setting']
      },
      games: {
        unsplashQueries: ['gaming', 'video games', 'esports', 'gaming setup', 'game controller'],
        dallePrompts: ['Modern gaming setup with RGB lighting', 'Futuristic gaming interface']
      },
      tech: {
        unsplashQueries: ['technology', 'gadgets', 'electronics', 'innovation', 'tech devices'],
        dallePrompts: ['Modern technology concept', 'Innovative tech gadgets arrangement']
      }
    };
  }

  // Приватные методы

  private determineImageSource(preferred: string | undefined, availability: ReturnType<typeof this.getAvailability>): 'unsplash' | 'dalle' | 'placeholder' {
    if (preferred === 'dalle' && availability.dalle) return 'dalle';
    if (preferred === 'unsplash' && availability.unsplash) return 'unsplash';
    
    // Автоматический выбор: предпочитаем Unsplash для скорости
    if (availability.unsplash) return 'unsplash';
    if (availability.dalle) return 'dalle';
    
    return 'placeholder';
  }

  private buildDALLEPrompt(request: ImageRequest): string {
    const styleMap = {
      realistic: 'photorealistic, high quality photography',
      modern: 'modern, clean, professional design',
      minimalist: 'minimalist, clean, simple composition',
      tech: 'high-tech, futuristic, technological',
      futuristic: 'futuristic, sci-fi, advanced technology'
    };

    const categoryMap = {
      ai: 'artificial intelligence, machine learning, neural networks',
      apple: 'Apple products, sleek design, premium technology',
      games: 'gaming, video games, entertainment technology',
      tech: 'technology, gadgets, innovation, electronics'
    };

    const style = styleMap[request.style || 'modern'];
    const categoryContext = categoryMap[request.category];
    
    return `A ${style} image representing ${categoryContext} for an article titled "${request.title}". The image should be professional, suitable for a technology blog, with excellent composition and lighting. ${request.description || ''}`.trim();
  }

  private buildUnsplashQuery(request: ImageRequest): string {
    const categoryImages = this.getCategoryImages();
    const queries = categoryImages[request.category]?.unsplashQueries || ['technology'];
    
    // Выбираем случайный запрос из подходящих для категории
    const baseQuery = queries[Math.floor(Math.random() * queries.length)];
    
    // Добавляем дополнительные ключевые слова из заголовка
    const titleWords = request.title.toLowerCase()
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 2); // Берем первые 2 значимых слова
    
    return [baseQuery, ...titleWords].join(' ');
  }

  private getCategoryQuery(category: string): string {
    const queries: Record<string, string> = {
      ai: 'artificial intelligence technology',
      apple: 'apple products iphone mac',
      games: 'gaming video games esports',
      tech: 'technology gadgets innovation',
      default: 'technology modern'
    };

    return queries[category] || queries.default;
  }

  private getDALLESize(dimensions?: { width: number; height: number }): '1024x1024' | '1792x1024' | '1024x1792' {
    if (!dimensions) return '1792x1024'; // Landscape по умолчанию

    const { width, height } = dimensions;
    const ratio = width / height;

    if (ratio > 1.5) return '1792x1024'; // Wide landscape
    if (ratio < 0.7) return '1024x1792'; // Portrait
    return '1024x1024'; // Square
  }

  private parseSizeToDimensions(size: string): { width: number; height: number } {
    const [width, height] = size.split('x').map(Number);
    return { width, height };
  }

  private async trackUnsplashDownload(photoId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrls.unsplash}/photos/${photoId}/download`, {
        headers: {
          'Authorization': `Client-ID ${this.unsplashApiKey}`
        }
      });
    } catch (error) {
      console.warn('Failed to track Unsplash download:', error);
    }
  }

  private optimizeUnsplashImage(imageUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }): string {
    const url = new URL(imageUrl);
    
    if (options.width) url.searchParams.set('w', options.width.toString());
    if (options.height) url.searchParams.set('h', options.height.toString());
    if (options.quality) url.searchParams.set('q', options.quality.toString());
    if (options.format) url.searchParams.set('fm', options.format);
    
    return url.toString();
  }

  private getPlaceholderImage(request: ImageRequest): ImageResult {
    const dimensions = request.dimensions || { width: 1200, height: 630 };
    const placeholderUrl = `https://picsum.photos/${dimensions.width}/${dimensions.height}?random=${Date.now()}`;

    return {
      url: placeholderUrl,
      source: 'placeholder',
      metadata: {
        title: request.title,
        description: 'Placeholder image generated automatically',
        dimensions
      }
    };
  }
}

// Экспортируем синглтон сервиса
export const imageService = new ImageService();



