/**
 * 🚀 ПРОДВИНУТЫЙ ПАРСЕР URL - v8.8.0
 * Улучшенная версия с поддержкой проблемных сайтов
 * Простое и надежное решение без внешних зависимостей
 */

import * as cheerio from 'cheerio';
import { systemLogger } from './system-logger';
import type { ExtractedContent, ParsingOptions } from './url-parser-service';

/**
 * Класс продвинутого парсера URL
 * Расширяет возможности базового парсера
 */
class AdvancedUrlParser {
  private defaultOptions: ParsingOptions = {
    timeout: 25000, // Увеличен timeout для медленных сайтов
    maxContentLength: 100000, // Увеличен лимит контента
    includeImages: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  /**
   * 🎯 Главная функция парсинга
   */
  async extractContent(url: string, options?: Partial<ParsingOptions>): Promise<ExtractedContent> {
    const opts = { ...this.defaultOptions, ...options };
    const timer = systemLogger.startTimer('api', 'advanced_url_parser', `Parsing: ${url.substring(0, 80)}`);
    
    try {
      console.log(`🚀 [Advanced Parser] Начинаем парсинг: ${url}`);
      
      // Валидация URL
      this.validateUrl(url);
      
      // Загружаем HTML с улучшенными заголовками
      const html = await this.fetchHtml(url, opts);
      
      if (!html || html.length < 1000) {
        throw new Error('Получен слишком короткий HTML (возможно редирект или ошибка)');
      }
      
      // Парсим с помощью Cheerio
      const $ = cheerio.load(html);
      
      // Удаляем все ненужные элементы ПЕРЕД извлечением
      this.removeJunk($);
      
      // Извлекаем контент с улучшенными селекторами
      const extractedContent: ExtractedContent = {
        title: this.extractTitle($, url),
        content: this.extractMainContent($, url, opts),
        excerpt: this.extractExcerpt($),
        author: this.extractAuthor($),
        publishedAt: this.extractPublishDate($),
        image: this.extractMainImage($, url),
        category: this.categorizeFromUrl(url),
        language: this.detectLanguage($, html),
        source: new URL(url).hostname,
        siteName: this.extractSiteName($, url)
      };
      
      // Валидация результата
      this.validateExtractedContent(extractedContent, url);
      
      console.log(`✅ [Advanced Parser] Успешно извлечено:`);
      console.log(`   - Заголовок: ${extractedContent.title.substring(0, 50)}...`);
      console.log(`   - Контент: ${extractedContent.content.length} символов`);
      console.log(`   - Изображение: ${extractedContent.image ? 'Да' : 'Нет'}`);
      
      await timer.success('URL parsed successfully', {
        url: url.substring(0, 100),
        title: extractedContent.title.substring(0, 80),
        contentLength: extractedContent.content.length,
        hasImage: !!extractedContent.image
      });
      
      return extractedContent;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Advanced Parser] Ошибка парсинга:`, errorMessage);
      
      await timer.error('URL parsing failed', {
        url: url.substring(0, 100),
        error: errorMessage
      }, error instanceof Error ? error.stack : undefined);
      
      throw new Error(`Не удалось извлечь контент из ${url}: ${errorMessage}`);
    }
  }

  /**
   * Загрузка HTML с улучшенными заголовками
   */
  private async fetchHtml(url: string, options: ParsingOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      console.log(`📡 [Advanced Parser] Загружаем HTML...`);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': options.userAgent!,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,pl;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          // Дополнительные заголовки для обхода защиты
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Неподдерживаемый тип контента: ${contentType}`);
      }

      const html = await response.text();
      console.log(`✅ [Advanced Parser] HTML загружен: ${html.length} символов`);
      
      return html;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout загрузки URL после ${options.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Удаление мусора из DOM ПЕРЕД извлечением
   */
  private removeJunk($: cheerio.CheerioAPI): void {
    // Расширенный список селекторов для удаления
    const removeSelectors = [
      // Scripts и styles
      'script', 'style', 'noscript', 'link[rel="stylesheet"]',
      
      // Навигация и меню
      'nav', 'header', 'footer', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.nav', '.menu', '.navigation', '.header', '.footer', '.site-header', '.site-footer',
      
      // Реклама
      '.ad', '.ads', '.advertisement', '.advert', '.sponsored', '.promo',
      '[id*="ad"]', '[class*="ad-"]', '[class*="_ad"]', '[data-ad]',
      
      // Социальные сети и шэринг
      '.social', '.share', '.sharing', '.social-share', '.share-buttons',
      '.social-links', '.social-icons', '.follow-us',
      
      // Комментарии
      '.comments', '#comments', '.comment', '.comment-section', '.disqus',
      '#disqus_thread', '.fb-comments', '.facebook-comments',
      
      // Sidebar и виджеты
      '.sidebar', '#sidebar', '.widget', '.widgets', 'aside',
      
      // Related и рекомендации
      '.related', '.recommended', '.more-articles', '.related-posts',
      '.you-may-like', '.recommended-for-you', '.popular-posts',
      
      // Cookie и privacy
      '.cookie', '.cookies', '.consent', '.gdpr', '.privacy-banner',
      '.cookie-notice', '.cookie-consent', '.privacy-notice',
      
      // Newsletter и подписки
      '.newsletter', '.subscribe', '.subscription', '.signup', '.sign-up',
      '.email-signup', '.newsletter-signup',
      
      // CTA и промо
      '.cta', '.call-to-action', '.banner', '.popup', '.modal',
      
      // Breadcrumbs и pagination
      '.breadcrumb', '.breadcrumbs', '.pagination', '.pager',
      
      // UI элементы
      'button', 'form', 'select', 'input', 'textarea',
      '.button', '.btn',
      
      // Фильтры и сортировка
      '.filter', '.filters', '.sort', '.sorting', '.tabs', '.tab-list',
      
      // Разное
      'iframe', 'embed', 'object', 'video', 'audio',
      '[data-testid]', '.skeleton', '.loading', '.placeholder',
      '.cookie-banner', '.notification', '.alert'
    ];
    
    removeSelectors.forEach(selector => {
      try {
        $(selector).remove();
      } catch (e) {
        // Игнорируем ошибки селекторов
      }
    });
  }

  /**
   * Извлечение заголовка с улучшенными селекторами
   */
  private extractTitle($: cheerio.CheerioAPI, url: string): string {
    const selectors = [
      // Основной заголовок статьи
      'article h1',
      '.article-title',
      '.post-title',
      '.entry-title',
      '.content h1',
      '.main-content h1',
      
      // Meta теги
      '[property="og:title"]',
      '[name="twitter:title"]',
      '[name="title"]',
      
      // Общие селекторы
      'h1.title',
      'h1[class*="title"]',
      'h1[id*="title"]',
      'h1',
      
      // Fallback
      'title'
    ];

    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const text = selector.includes('[') 
            ? element.attr('content') || element.text()
            : element.text();
          
          const cleanTitle = this.cleanText(text);
          if (cleanTitle && cleanTitle.length >= 10 && cleanTitle.length <= 300) {
            return cleanTitle;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Последний fallback - извлекаем из URL
    const urlParts = url.split('/').filter(p => p && p.length > 3);
    if (urlParts.length > 0) {
      const lastPart = urlParts[urlParts.length - 1];
      return this.cleanText(lastPart.replace(/[-_]/g, ' '));
    }

    return 'Extracted Article';
  }

  /**
   * Извлечение контента с улучшенными селекторами
   */
  private extractMainContent($: cheerio.CheerioAPI, url: string, options: ParsingOptions): string {
    console.log(`📄 [Advanced Parser] Извлекаем контент...`);
    
    const contentSelectors = [
      // Приоритетные селекторы для статейного контента
      'article[class*="content"]',
      'article .content',
      'article .body',
      '.article-content',
      '.article-body',
      '.post-content',
      '.post-body',
      '.entry-content',
      '.entry-body',
      '.story-content',
      '.story-body',
      '.content-body',
      
      // Schema.org
      '[itemprop="articleBody"]',
      '[itemprop="text"]',
      
      // Role attributes
      '[role="article"]',
      '[role="main"] article',
      
      // Общие селекторы
      'article',
      'main article',
      '.content',
      'main .content',
      'main',
      '.main-content',
      '[role="main"]',
      '#content',
      '#main-content'
    ];

    let bestContent = '';
    let bestScore = 0;

    for (const selector of contentSelectors) {
      try {
        const element = $(selector).first();
        if (!element.length) continue;
        
        const content = this.extractTextFromElement(element, $);
        const score = this.scoreContent(content);
        
        console.log(`   Селектор "${selector}": ${content.length} символов, score: ${score}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestContent = content;
        }
      } catch (e) {
        continue;
      }
    }

    // Если не нашли через селекторы, собираем все параграфы
    if (!bestContent || bestContent.length < 500) {
      console.log(`   ⚠️ Недостаточно контента через селекторы, собираем параграфы...`);
      const paragraphs = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(p => p.length > 80); // Только длинные параграфы
      
      bestContent = paragraphs.join('\n\n');
    }

    // Обрезаем если слишком длинный
    if (bestContent.length > options.maxContentLength!) {
      bestContent = bestContent.substring(0, options.maxContentLength!) + '...';
    }

    console.log(`✅ [Advanced Parser] Извлечено ${bestContent.length} символов контента`);
    
    return this.cleanText(bestContent) || 'Контент не найден';
  }

  /**
   * Извлечение текста из элемента
   */
  private extractTextFromElement(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    const textParts: string[] = [];
    
    element.find('h2, h3, h4, p, li, blockquote, div').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (!text || text.length < 30) return;
      
      // Пропускаем элементы с подозрительным контентом
      const suspicious = [
        'cookie', 'subscribe', 'newsletter', 'sign up',
        'follow us', 'share', 'comment', 'advertisement'
      ];
      
      const textLower = text.toLowerCase();
      const hasSuspicious = suspicious.some(word => textLower.includes(word));
      
      if (!hasSuspicious) {
        const tagName = el.tagName?.toLowerCase();
        if (['h2', 'h3', 'h4'].includes(tagName!)) {
          textParts.push(`\n## ${text}\n`);
        } else {
          textParts.push(text);
        }
      }
    });

    return textParts.join('\n\n');
  }

  /**
   * Оценка качества контента
   */
  private scoreContent(content: string): number {
    if (!content) return 0;
    
    let score = 0;
    
    // Длина контента (больше = лучше, но не слишком много)
    if (content.length > 500) score += 30;
    if (content.length > 1000) score += 20;
    if (content.length > 2000) score += 10;
    
    // Количество параграфов
    const paragraphs = content.split('\n\n').filter(p => p.length > 50);
    score += Math.min(paragraphs.length * 5, 30);
    
    // Наличие заголовков
    const hasHeadings = /^##\s/m.test(content);
    if (hasHeadings) score += 15;
    
    // Нет подозрительных паттернов
    const junkPhrases = ['cookie', 'subscribe', 'newsletter', 'advertisement'];
    const junkCount = junkPhrases.filter(phrase => 
      content.toLowerCase().includes(phrase)
    ).length;
    score -= junkCount * 10;
    
    return Math.max(0, score);
  }

  /**
   * Извлечение excerpt
   */
  private extractExcerpt($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[property="og:description"]',
      '[name="description"]',
      '[name="twitter:description"]',
      '.excerpt',
      '.summary',
      '.lead',
      '.intro'
    ];

    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const text = selector.includes('[')
            ? element.attr('content')
            : element.text();
          
          const cleanExcerpt = this.cleanText(text || '');
          if (cleanExcerpt && cleanExcerpt.length > 50) {
            return cleanExcerpt.substring(0, 350);
          }
        }
      } catch (e) {
        continue;
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
      '[itemprop="author"]',
      '[property="article:author"]',
      '.author',
      '.by-author',
      '.post-author',
      '.article-author',
      '[class*="author"]'
    ];

    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const author = this.cleanText(element.text());
          if (author && author.length > 2 && author.length < 100) {
            return author.replace(/^(by|автор|autor)[:;\s]*/i, '').trim();
          }
        }
      } catch (e) {
        continue;
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
      '[itemprop="datePublished"]',
      '.published',
      '.post-date',
      '.date',
      '[class*="publish"]',
      '[class*="date"]'
    ];

    for (const selector of selectors) {
      try {
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
      } catch (e) {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Извлечение главного изображения
   */
  private extractMainImage($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    const selectors = [
      '[property="og:image"]',
      '[name="twitter:image"]',
      '[itemprop="image"]',
      'article img[src]',
      '.featured-image img',
      '.post-image img',
      '.article-image img',
      '.hero-image img',
      '.main-image',
      'img[class*="featured"]',
      'img[class*="hero"]'
    ];

    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const src = element.attr('content') || element.attr('src');
          if (src && !src.includes('data:image') && !src.includes('placeholder')) {
            return this.resolveUrl(src, baseUrl);
          }
        }
      } catch (e) {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Извлечение названия сайта
   */
  private extractSiteName($: cheerio.CheerioAPI, url: string): string | undefined {
    const selectors = [
      '[property="og:site_name"]',
      '.site-name',
      '.site-title',
      '.logo[alt]'
    ];

    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const siteName = element.attr('content') || element.attr('alt') || element.text();
          if (siteName) {
            return this.cleanText(siteName);
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback - из URL
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      return undefined;
    }
  }

  /**
   * Определение языка
   */
  private detectLanguage($: cheerio.CheerioAPI, html: string): string {
    // Из HTML атрибута
    const htmlLang = $('html').attr('lang');
    if (htmlLang) {
      return htmlLang.split('-')[0].toLowerCase();
    }

    // Из og:locale
    const ogLocale = $('[property="og:locale"]').attr('content');
    if (ogLocale) {
      return ogLocale.split('_')[0].toLowerCase();
    }

    // По контенту
    const sample = html.substring(0, 2000).toLowerCase();
    
    // Кириллица = русский
    const cyrillicCount = (sample.match(/[а-яё]/gi) || []).length;
    if (cyrillicCount > sample.length * 0.15) {
      return 'ru';
    }
    
    // Польские символы
    const polishChars = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];
    const polishCount = polishChars.reduce((count, char) => 
      count + (sample.match(new RegExp(char, 'g')) || []).length, 0
    );
    if (polishCount > 5) {
      return 'pl';
    }

    return 'en';
  }

  /**
   * Категоризация по URL
   */
  private categorizeFromUrl(url: string): 'ai' | 'apple' | 'games' | 'tech' {
    const urlLower = url.toLowerCase();
    
    if (this.matchesKeywords(urlLower, [
      'ai', 'artificial-intelligence', 'machine-learning', 'neural',
      'openai', 'chatgpt', 'claude', 'gemini', 'llm', 'gpt'
    ])) {
      return 'ai';
    }
    
    if (this.matchesKeywords(urlLower, [
      'apple', 'iphone', 'ipad', 'macos', 'ios', 'macbook',
      '9to5mac', 'macrumors', 'appleinsider'
    ])) {
      return 'apple';
    }
    
    if (this.matchesKeywords(urlLower, [
      'game', 'gaming', 'steam', 'playstation', 'xbox',
      'nintendo', 'esports', 'gamer'
    ])) {
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
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Поддерживаются только HTTP и HTTPS URL');
      }
    } catch (error) {
      throw new Error(`Невалидный URL: ${url}`);
    }
  }

  private validateExtractedContent(content: ExtractedContent, url: string): void {
    if (!content.title || content.title.length < 10) {
      throw new Error('Не удалось извлечь заголовок статьи (слишком короткий)');
    }
    
    if (!content.content || content.content.length < 200) {
      throw new Error(`Извлеченный контент слишком короткий (${content.content.length} символов)`);
    }
    
    // Проверяем что это не страница ошибки
    const errorKeywords = ['404', 'not found', 'page not found', 'error', 'access denied'];
    const titleLower = content.title.toLowerCase();
    
    if (errorKeywords.some(keyword => titleLower.includes(keyword))) {
      throw new Error('Страница содержит ошибку или недоступна');
    }
  }

  /**
   * Проверка доступности
   */
  isAvailable(): boolean {
    return true;
  }
}

// Экспортируем синглтон
export const advancedUrlParser = new AdvancedUrlParser();

