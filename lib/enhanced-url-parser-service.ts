/**
 * 🚀 УЛУЧШЕННЫЙ СЕРВИС ПАРСИНГА URL КОНТЕНТА
 * Поддерживает как статические HTML, так и динамические JavaScript-сайты
 * ✅ v8.8.0: Enhanced URL Parser with Jina AI Reader API support
 */

import * as cheerio from 'cheerio';
import { systemLogger } from './system-logger';

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  image?: string;
  category?: 'ai' | 'apple' | 'games' | 'tech';
  language?: string;
  source: string;
  siteName?: string;
}

export interface ParsingOptions {
  timeout?: number;
  maxContentLength?: number;
  includeImages?: boolean;
  userAgent?: string;
  useDynamicParser?: boolean; // Использовать Jina AI для динамических сайтов
}

class EnhancedUrlParserService {
  private defaultOptions: ParsingOptions = {
    timeout: 20000, // 20 секунд
    maxContentLength: 50000, // 50KB текста
    includeImages: true,
    userAgent: 'Mozilla/5.0 (compatible; IcoffioBot/2.0; +https://icoffio.com)',
    useDynamicParser: true
  };

  /**
   * 🎯 ОСНОВНАЯ ФУНКЦИЯ - Извлечение контента с веб-страницы
   * Автоматически выбирает лучший метод парсинга
   */
  async extractContent(url: string, options?: Partial<ParsingOptions>): Promise<ExtractedContent> {
    const opts = { ...this.defaultOptions, ...options };
    const timer = systemLogger.startTimer('api', 'enhanced_url_parser', `Parsing URL: ${url.substring(0, 80)}`);
    
    try {
      console.log(`🌐 [Enhanced Parser] Парсим URL: ${url}`);
      await systemLogger.info('api', 'enhanced_url_parser', 'Starting URL extraction', {
        url: url.substring(0, 100),
        timeout: opts.timeout,
        dynamicParserEnabled: opts.useDynamicParser
      });
      
      // 1. Проверяем валидность URL
      this.validateUrl(url);
      
      let extractedContent: ExtractedContent | null = null;
      let staticParsingFailed = false;
      
      // 2. ПОПЫТКА #1: Статический парсинг (быстрый)
      try {
        console.log(`📄 [Enhanced Parser] Пробуем статический парсинг...`);
        extractedContent = await this.parseStaticContent(url, opts);
        console.log(`✅ [Enhanced Parser] Статический парсинг успешен!`);
      } catch (error) {
        console.warn(`⚠️ [Enhanced Parser] Статический парсинг не удался:`, error instanceof Error ? error.message : error);
        staticParsingFailed = true;
      }
      
      // 3. ПОПЫТКА #2: Динамический парсинг через Jina AI (если включен и статический не сработал)
      if (staticParsingFailed && opts.useDynamicParser) {
        try {
          console.log(`🤖 [Enhanced Parser] Используем Jina AI Reader для динамического контента...`);
          extractedContent = await this.parseDynamicContent(url, opts);
          console.log(`✅ [Enhanced Parser] Динамический парсинг успешен!`);
        } catch (error) {
          console.error(`❌ [Enhanced Parser] Динамический парсинг не удался:`, error);
          throw new Error(`Не удалось извлечь контент из ${url}. Проверьте доступность страницы.`);
        }
      }
      
      if (!extractedContent) {
        throw new Error('Не удалось извлечь контент из URL');
      }
      
      await timer.success('URL parsed successfully', {
        url: url.substring(0, 100),
        title: extractedContent.title.substring(0, 80),
        contentLength: extractedContent.content.length,
        hasImage: !!extractedContent.image,
        method: staticParsingFailed ? 'dynamic' : 'static'
      });
      
      return extractedContent;
      
    } catch (error) {
      console.error(`❌ [Enhanced Parser] Ошибка парсинга ${url}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await timer.error('URL parsing failed', {
        url: url.substring(0, 100),
        error: errorMessage
      }, error instanceof Error ? error.stack : undefined);
      
      throw new Error(`Failed to extract content from ${url}: ${errorMessage}`);
    }
  }

  /**
   * 📄 МЕТОД #1: Статический парсинг (fetch + cheerio)
   * Быстрый метод для обычных HTML страниц
   */
  private async parseStaticContent(url: string, options: ParsingOptions): Promise<ExtractedContent> {
    const html = await this.fetchHtml(url, options);
    const $ = cheerio.load(html);
    
    const extractedContent: ExtractedContent = {
      title: this.extractTitle($),
      content: this.extractMainContent($, options),
      excerpt: this.extractExcerpt($),
      author: this.extractAuthor($),
      publishedAt: this.extractPublishDate($),
      image: this.extractMainImage($, url),
      category: this.categorizeFromUrl(url),
      language: this.detectLanguage($),
      source: new URL(url).hostname,
      siteName: this.extractSiteName($)
    };

    // Валидация результата
    this.validateExtractedContent(extractedContent, url);
    
    return extractedContent;
  }

  /**
   * 🤖 МЕТОД #2: Динамический парсинг через Jina AI Reader
   * Для JavaScript-рендеренных страниц (SPA)
   */
  private async parseDynamicContent(url: string, options: ParsingOptions): Promise<ExtractedContent> {
    // Используем Jina AI Reader API
    const jinaUrl = `https://r.jina.ai/${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout!);
    
    try {
      const response = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown', // Возвращает в markdown формате
          'User-Agent': options.userAgent!
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Jina AI Reader failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Jina AI возвращает структурированные данные
      const content = data.data?.content || data.content || '';
      const title = data.data?.title || data.title || this.extractTitleFromContent(content);
      const description = data.data?.description || data.description || '';
      const image = data.data?.image || data.image;
      const author = data.data?.author || data.author;
      const publishedTime = data.data?.publishedTime || data.publishedTime;
      
      if (!content || content.length < 100) {
        throw new Error('Jina AI вернул слишком мало контента');
      }
      
      const extractedContent: ExtractedContent = {
        title: title || 'Extracted Article',
        content: this.cleanMarkdownContent(content),
        excerpt: description || content.substring(0, 300).trim() + '...',
        author: author,
        publishedAt: publishedTime,
        image: image,
        category: this.categorizeFromUrl(url),
        language: this.detectLanguageFromText(content),
        source: new URL(url).hostname,
        siteName: new URL(url).hostname.replace('www.', '')
      };
      
      console.log(`✅ [Jina AI] Извлечено:
        - Заголовок: ${extractedContent.title}
        - Контент: ${extractedContent.content.length} символов
        - Изображение: ${extractedContent.image ? 'Да' : 'Нет'}
      `);
      
      return extractedContent;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Jina AI Reader timeout after ${options.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Загрузка HTML контента (для статического парсинга)
   */
  private async fetchHtml(url: string, options: ParsingOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': options.userAgent!,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,pl;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      return await response.text();
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`URL load timeout after ${options.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Очистка markdown контента от Jina AI
   */
  private cleanMarkdownContent(markdown: string): string {
    // Удаляем метаданные в начале (если есть)
    let cleaned = markdown.replace(/^---[\s\S]*?---\n/, '');
    
    // Удаляем лишние пробелы и переносы
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Извлечение заголовка из контента (fallback)
   */
  private extractTitleFromContent(content: string): string {
    // Ищем первый заголовок H1 в markdown
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    // Ищем первую строку
    const firstLine = content.split('\n')[0].trim();
    if (firstLine && firstLine.length > 10 && firstLine.length < 200) {
      return firstLine.replace(/^#+\s*/, ''); // Удаляем markdown заголовки
    }
    
    return 'Extracted Article';
  }

  /**
   * Определение языка из текста
   */
  private detectLanguageFromText(text: string): string {
    const sample = text.substring(0, 500).toLowerCase();
    
    // Проверяем на кириллицу
    const cyrillicCount = (sample.match(/[а-яё]/gi) || []).length;
    if (cyrillicCount > sample.length * 0.3) {
      return 'ru';
    }
    
    // Проверяем на польский
    const polishChars = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];
    const polishCount = polishChars.reduce((count, char) => 
      count + (sample.match(new RegExp(char, 'g')) || []).length, 0
    );
    if (polishCount > 5) {
      return 'pl';
    }
    
    return 'en'; // По умолчанию английский
  }

  // ========== МЕТОДЫ СТАТИЧЕСКОГО ПАРСИНГА (из оригинального сервиса) ==========

  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      'h1',
      '[property="og:title"]',
      '[name="twitter:title"]',
      'title',
      '.post-title',
      '.article-title',
      '.entry-title',
      'header h1',
      'article h1'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = selector.includes('[') 
          ? element.attr('content') || element.text()
          : element.text();
        
        const cleanTitle = this.cleanText(text);
        if (cleanTitle && cleanTitle.length > 10) {
          return cleanTitle;
        }
      }
    }

    return 'Extracted Article';
  }

  private extractMainContent($: cheerio.CheerioAPI, options: ParsingOptions): string {
    // Удаляем нежелательные элементы
    const removeSelectors = [
      'script', 'style', 'nav', 'footer', 'header', 'noscript',
      '.nav', '.menu', '.sidebar', '.ads', '.advertisement', '.social',
      'iframe', 'embed', 'object', 'video', 'audio',
      '.comments', '#comments', '.comment', '.comment-section',
      '.related', '.recommended', '.more-articles', '.related-posts',
      '.cookie', '.cookies', '.consent', '.gdpr', '.privacy-banner',
      '.newsletter', '.subscribe', '.signup', '.cta',
      '.share', '.sharing', '.social-share', '.share-buttons',
      '.breadcrumb', '.breadcrumbs', '.pagination',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.filter', '.sort', '.tabs', '.tab-list',
      '[data-testid]',
      '.skeleton', '.loading', '.placeholder',
      'button', 'form', 'select', 'input'
    ];
    
    removeSelectors.forEach(selector => $(selector).remove());

    const contentSelectors = [
      'article .content',
      'article .body',
      '.article-content',
      '.article-body',
      '.post-content',
      '.post-body',
      '.entry-content',
      '.story-content',
      '.story-body',
      '[itemprop="articleBody"]',
      '[role="article"]',
      'article',
      'main article',
      '.content',
      'main',
      '.main-content',
      '[role="main"]'
    ];

    let content = '';

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = this.extractTextContent(element, $);
        if (content.length > 200) {
          break;
        }
      }
    }

    if (!content || content.length < 200) {
      const paragraphs = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(p => p.length > 50);
      
      content = paragraphs.join('\n\n');
    }

    if (content.length > options.maxContentLength!) {
      content = content.substring(0, options.maxContentLength!) + '...';
    }

    return this.cleanText(content) || 'Контент не найден';
  }

  private extractTextContent(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    const textParts: string[] = [];
    
    element.find('h1, h2, h3, h4, h5, h6, p, li, blockquote').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text && text.length > 20) {
        const tagName = el.tagName?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName!)) {
          const level = parseInt(tagName!.charAt(1));
          const prefix = '#'.repeat(Math.min(level, 4));
          textParts.push(`${prefix} ${text}`);
        } else {
          textParts.push(text);
        }
      }
    });

    return textParts.join('\n\n');
  }

  private extractExcerpt($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[property="og:description"]',
      '[name="description"]',
      '[name="twitter:description"]',
      '.excerpt',
      '.summary',
      '.lead'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = selector.includes('[')
          ? element.attr('content')
          : element.text();
        
        const cleanExcerpt = this.cleanText(text || '');
        if (cleanExcerpt && cleanExcerpt.length > 50) {
          return cleanExcerpt.substring(0, 300);
        }
      }
    }

    return undefined;
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[rel="author"]',
      '.author',
      '.by-author',
      '[itemprop="author"]',
      '.post-author',
      '.article-author'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const author = this.cleanText(element.text());
        if (author && author.length > 2) {
          return author;
        }
      }
    }

    return undefined;
  }

  private extractPublishDate($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[property="article:published_time"]',
      'time[datetime]',
      '.published',
      '.post-date',
      '.date'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const dateStr = element.attr('datetime') || element.attr('content') || element.text();
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }

    return undefined;
  }

  private extractMainImage($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    const selectors = [
      '[property="og:image"]',
      '[name="twitter:image"]',
      '.featured-image img',
      'article img',
      '.post-image img',
      '.main-image'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const src = element.attr('content') || element.attr('src');
        if (src) {
          return this.resolveUrl(src, baseUrl);
        }
      }
    }

    return undefined;
  }

  private extractSiteName($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[property="og:site_name"]',
      '.site-name',
      '.site-title'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const siteName = element.attr('content') || element.text();
        if (siteName) {
          return this.cleanText(siteName);
        }
      }
    }

    return undefined;
  }

  private detectLanguage($: cheerio.CheerioAPI): string {
    const htmlLang = $('html').attr('lang');
    if (htmlLang) {
      return htmlLang.split('-')[0].toLowerCase();
    }

    const ogLocale = $('[property="og:locale"]').attr('content');
    if (ogLocale) {
      return ogLocale.split('_')[0].toLowerCase();
    }

    return 'en';
  }

  private categorizeFromUrl(url: string): 'ai' | 'apple' | 'games' | 'tech' {
    const urlLower = url.toLowerCase();
    
    if (this.matchesKeywords(urlLower, ['ai', 'artificial-intelligence', 'machine-learning', 'neural', 'openai', 'chatgpt', 'claude', 'gemini'])) {
      return 'ai';
    }
    
    if (this.matchesKeywords(urlLower, ['apple', 'iphone', 'ipad', 'macos', 'ios', 'macbook', '9to5mac', 'macrumors'])) {
      return 'apple';
    }
    
    if (this.matchesKeywords(urlLower, ['game', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'esports'])) {
      return 'games';
    }
    
    return 'tech';
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  private validateExtractedContent(content: ExtractedContent, url: string): void {
    if (!content.title || content.title.length < 10) {
      throw new Error('Не удалось извлечь заголовок статьи');
    }
    
    if (!content.content || content.content.length < 100) {
      throw new Error('Извлеченный контент слишком короткий (возможно SPA без SSR)');
    }
    
    // Проверяем, что это не страница ошибки
    const errorKeywords = ['404', 'not found', 'page not found', 'error', 'access denied'];
    const titleLower = content.title.toLowerCase();
    
    if (errorKeywords.some(keyword => titleLower.includes(keyword))) {
      throw new Error('Страница содержит ошибку или недоступна');
    }
  }

  /**
   * 🏥 Проверка доступности сервиса
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * 🧪 Тестирование парсинга URL
   */
  async testUrl(url: string): Promise<{ success: boolean; error?: string; preview?: Partial<ExtractedContent> }> {
    try {
      const content = await this.extractContent(url, { 
        timeout: 10000, 
        maxContentLength: 1000 
      });
      
      return {
        success: true,
        preview: {
          title: content.title,
          excerpt: content.excerpt || content.content.substring(0, 200) + '...',
          category: content.category,
          source: content.source,
          siteName: content.siteName
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
}

// Экспортируем синглтон
export const enhancedUrlParserService = new EnhancedUrlParserService();

