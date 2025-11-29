/**
 * 🌐 СЕРВИС ПАРСИНГА URL КОНТЕНТА
 * Извлекает заголовок, контент, изображения и метаданные с веб-страниц
 */

import * as cheerio from 'cheerio';

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
}

class UrlParserService {
  private defaultOptions: ParsingOptions = {
    timeout: 15000, // 15 секунд (увеличено с 10)
    maxContentLength: 50000, // 50KB текста
    includeImages: true,
    userAgent: 'Mozilla/5.0 (compatible; IcoffioBot/1.0; +https://icoffio.com)'
  };

  /**
   * 🎯 ОСНОВНАЯ ФУНКЦИЯ - Извлечение контента с веб-страницы
   */
  async extractContent(url: string, options?: Partial<ParsingOptions>): Promise<ExtractedContent> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      console.log(`🌐 Парсим URL: ${url}`);
      
      // 1. Проверяем валидность URL
      this.validateUrl(url);
      
      // 2. Загружаем HTML контент
      const html = await this.fetchHtml(url, opts);
      
      // 3. Парсим контент с помощью Cheerio
      const $ = cheerio.load(html);
      
      // 4. Извлекаем все необходимые данные
      const extractedContent: ExtractedContent = {
        title: this.extractTitle($),
        content: this.extractMainContent($, opts),
        excerpt: this.extractExcerpt($),
        author: this.extractAuthor($),
        publishedAt: this.extractPublishDate($),
        image: this.extractMainImage($, url),
        category: this.categorizeFromUrl(url),
        language: this.detectLanguage($),
        source: new URL(url).hostname,
        siteName: this.extractSiteName($)
      };

      // 5. Валидация результата
      this.validateExtractedContent(extractedContent, url);
      
      console.log(`✅ Успешно извлечен контент: ${extractedContent.title}`);
      return extractedContent;
      
    } catch (error) {
      console.error(`❌ Ошибка парсинга URL ${url}:`, error);
      throw new Error(`Не удалось извлечь контент с ${url}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  // ========== ПРИВАТНЫЕ МЕТОДЫ ==========

  /**
   * Проверка валидности URL
   */
  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Поддерживаются только HTTP и HTTPS URL');
      }
    } catch (error) {
      throw new Error(`Некорректный URL: ${url}`);
    }
  }

  /**
   * Загрузка HTML контента
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
          'Accept-Language': 'ru,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Неподдерживаемый тип контента: ${contentType}`);
      }

      return await response.text();
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Таймаут загрузки URL после ${options.timeout}ms`);
      } else if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(`Ошибка загрузки URL: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Извлечение заголовка статьи
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // Приоритетный порядок поиска заголовка
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

    return 'Извлеченная статья';
  }

  /**
   * Извлечение основного контента
   */
  private extractMainContent($: cheerio.CheerioAPI, options: ParsingOptions): string {
    // 🧹 Удаляем нежелательные элементы (расширенный список)
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
      '.filter', '.sort', '.tabs', '.tab-list', // ✅ Фильтры и сортировки
      '[data-testid]', // React test IDs
      '.skeleton', '.loading', '.placeholder',
      'button', 'form', 'select', 'input', // UI элементы
    ];
    
    removeSelectors.forEach(selector => $(selector).remove());

    // Приоритетные селекторы для основного контента
    const contentSelectors = [
      // Стандартные статейные селекторы
      'article .content',
      'article .body',
      '.article-content',
      '.article-body',
      '.post-content',
      '.post-body',
      '.entry-content',
      '.story-content',
      '.story-body',
      // Общие селекторы
      '[itemprop="articleBody"]',
      '[role="article"]',
      'article',
      'main article',
      '.content',
      'main',
      '.main-content',
      '[role="main"]',
    ];

    let content = '';

    // Ищем контент по селекторам
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = this.extractTextContent(element, $);
        // ✅ Проверяем качество контента
        if (content.length > 200 && this.isQualityContent(content)) {
          break;
        }
      }
    }

    // Если не нашли через селекторы, берем все параграфы
    if (!content || content.length < 200 || !this.isQualityContent(content)) {
      const paragraphs = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(p => p.length > 50 && this.isQualityParagraph(p)); // ✅ Фильтруем мусор
      
      content = paragraphs.join('\n\n');
    }

    // ✅ Финальная очистка контента от мусорных паттернов
    content = this.cleanJunkPatterns(content);

    // Обрезаем контент если он слишком длинный
    if (content.length > options.maxContentLength!) {
      content = content.substring(0, options.maxContentLength!) + '...';
    }

    return this.cleanText(content) || 'Контент не найден';
  }

  /**
   * ✅ Проверка качества контента (не UI-мусор)
   */
  private isQualityContent(content: string): boolean {
    // Паттерны UI-мусора
    const junkPatterns = [
      /FilterSort/i,
      /Switch cards/i,
      /Show Media/i,
      /Hide Media/i,
      /Load more/i,
      /View all/i,
      /Sign in/i,
      /Sign up/i,
      /Log in/i,
      /Subscribe/i,
      /Newsletter/i,
      /Cookie/i,
      /Privacy Policy/i,
      /Terms of Service/i,
      /Accept all/i,
      /Reject all/i,
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/im, // Только даты
    ];

    // Если больше 30% контента - это повторяющиеся паттерны, это мусор
    const contentLower = content.toLowerCase();
    let junkScore = 0;
    
    junkPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        junkScore += matches.length * 10;
      }
    });

    // Проверяем соотношение мусора к контенту
    const junkRatio = junkScore / content.length;
    return junkRatio < 0.1; // Меньше 10% мусора
  }

  /**
   * ✅ Проверка качества отдельного параграфа
   */
  private isQualityParagraph(text: string): boolean {
    // Исключаем короткие тексты
    if (text.length < 50) return false;
    
    // Исключаем UI-паттерны
    const junkPhrases = [
      'filter', 'sort', 'switch', 'cards', 'media',
      'load more', 'view all', 'see more', 'read more',
      'sign in', 'sign up', 'log in', 'log out',
      'subscribe', 'newsletter', 'cookie', 'privacy',
      'accept', 'reject', 'consent', 'agree'
    ];
    
    const textLower = text.toLowerCase();
    const junkCount = junkPhrases.filter(phrase => textLower.includes(phrase)).length;
    
    // Если текст содержит много UI-фраз, это не параграф статьи
    return junkCount < 3;
  }

  /**
   * ✅ Очистка контента от мусорных паттернов
   */
  private cleanJunkPatterns(content: string): string {
    let cleaned = content;
    
    // Удаляем повторяющиеся паттерны
    const junkPatterns = [
      /FilterSortSwitch cards to show MediaSwitch cards to hide Media/gi,
      /Switch cards to show Media/gi,
      /Switch cards to hide Media/gi,
      /Load more\s*/gi,
      /View all\s*/gi,
      /See more\s*/gi,
      /Read more\s*/gi,
      /Sign in\s*/gi,
      /Sign up\s*/gi,
      /Log in\s*/gi,
      /Subscribe\s*/gi,
      /Newsletter\s*/gi,
      /Accept all cookies?\s*/gi,
      /Reject all\s*/gi,
      /Cookie settings?\s*/gi,
      /Privacy Policy\s*/gi,
      /Terms of (Service|Use)\s*/gi,
      // Удаляем строки только с датами
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s*$/gim,
      // Удаляем короткие категории/теги в начале строк
      /^(Product|Company|Research|Safety|Security|Publication)\s*$/gim,
    ];
    
    junkPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Удаляем множественные пробелы и переносы строк
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/\s{3,}/g, ' ');
    
    return cleaned.trim();
  }

  /**
   * Извлечение текстового контента из элемента
   */
  private extractTextContent(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    const textParts: string[] = [];
    
    element.find('h1, h2, h3, h4, h5, h6, p, li, blockquote, div').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text && text.length > 20) {
        // Добавляем заголовки с префиксом #
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

  /**
   * Извлечение краткого описания
   */
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

  /**
   * Извлечение автора
   */
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

  /**
   * Извлечение даты публикации
   */
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

  /**
   * Извлечение основного изображения
   */
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

  /**
   * Определение названия сайта
   */
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

  /**
   * Определение языка контента
   */
  private detectLanguage($: cheerio.CheerioAPI): string {
    const htmlLang = $('html').attr('lang');
    if (htmlLang) {
      return htmlLang.split('-')[0].toLowerCase();
    }

    const ogLocale = $('[property="og:locale"]').attr('content');
    if (ogLocale) {
      return ogLocale.split('_')[0].toLowerCase();
    }

    return 'en'; // Default English for icoffio
  }

  /**
   * Определение категории по URL
   */
  private categorizeFromUrl(url: string): 'ai' | 'apple' | 'games' | 'tech' {
    const urlLower = url.toLowerCase();
    
    // AI/ML ключевые слова
    if (this.matchesKeywords(urlLower, ['ai', 'artificial-intelligence', 'machine-learning', 'neural', 'openai', 'chatgpt', 'claude', 'gemini'])) {
      return 'ai';
    }
    
    // Apple ключевые слова
    if (this.matchesKeywords(urlLower, ['apple', 'iphone', 'ipad', 'macos', 'ios', 'macbook', '9to5mac', 'macrumors'])) {
      return 'apple';
    }
    
    // Gaming ключевые слова
    if (this.matchesKeywords(urlLower, ['game', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'esports'])) {
      return 'games';
    }
    
    return 'tech'; // По умолчанию технологии
  }

  /**
   * Проверка на совпадение ключевых слов
   */
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Преобразование относительного URL в абсолютный
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * Очистка текста от лишних символов
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Множественные пробелы в один
      .replace(/\n\s*\n/g, '\n\n')    // Множественные переносы в двойные
      .replace(/^\s+|\s+$/g, '')      // Убираем пробелы по краям
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Убираем невидимые символы
      .trim();
  }

  /**
   * Валидация извлеченного контента
   */
  private validateExtractedContent(content: ExtractedContent, url: string): void {
    if (!content.title || content.title.length < 10) {
      throw new Error('Не удалось извлечь заголовок статьи');
    }
    
    if (!content.content || content.content.length < 100) {
      throw new Error('Извлеченный контент слишком короткий');
    }
    
    // Проверяем, что это не страница ошибки
    const errorKeywords = ['404', 'not found', 'page not found', 'error', 'access denied'];
    const titleLower = content.title.toLowerCase();
    
    if (errorKeywords.some(keyword => titleLower.includes(keyword))) {
      throw new Error('Страница содержит ошибку или недоступна');
    }
    
    // ✅ Проверяем качество контента
    if (!this.isQualityContent(content.content)) {
      console.warn(`⚠️ Низкое качество контента с ${url} - возможно это SPA страница`);
      // Не выбрасываем ошибку, но логируем предупреждение
    }
    
    // ✅ Проверяем минимальное количество "нормальных" слов
    const words = content.content.split(/\s+/).filter(w => w.length > 3);
    if (words.length < 50) {
      throw new Error('Контент содержит слишком мало текста (возможно SPA страница без SSR)');
    }
  }

  /**
   * 🏥 Проверка доступности сервиса
   */
  isAvailable(): boolean {
    return true; // Сервис всегда доступен, использует встроенный fetch
  }

  /**
   * 🧪 Тестирование парсинга URL
   */
  async testUrl(url: string): Promise<{ success: boolean; error?: string; preview?: Partial<ExtractedContent> }> {
    try {
      const content = await this.extractContent(url, { 
        timeout: 5000, 
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
export const urlParserService = new UrlParserService();
