/**
 * 🚀 ЕДИНЫЙ СЕРВИС УПРАВЛЕНИЯ СТАТЬЯМИ ICOFFIO
 * Объединяет всю функциональность создания, перевода и публикации статей
 */

import { translationService } from './translation-service';
import { copywritingService } from './copywriting-service';
import { imageService } from './image-service';
import { wordpressService } from './wordpress-service';
import { urlParserService } from './url-parser-service';
import { addRuntimeArticle } from './local-articles';
import type { Post } from './types';

// ========== ИНТЕРФЕЙСЫ ==========

export interface ArticleInput {
  // Источники данных
  url?: string;
  title?: string;
  content?: string;
  
  // Метаданные
  category?: 'ai' | 'apple' | 'games' | 'tech';
  author?: string;
  language?: string;
  
  // Telegram данные (для n8n)
  chatId?: string;
  messageId?: string;
  
  // Опции обработки
  enhanceContent?: boolean;
  generateImage?: boolean;
  translateToAll?: boolean;
  publishToWordPress?: boolean;
}

export interface ProcessedArticle {
  // Основные данные
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  
  // Метаданные
  category: string;
  tags: string[];
  author: string;
  language: string;
  image?: string;
  metaDescription?: string;
  
  // Временные метки
  createdAt: string;
  publishedAt?: string;
  
  // Переводы
  translations: Record<string, {
    title: string;
    content: string;
    excerpt: string;
    slug: string;
  }>;
  
  // Источник
  source: {
    type: 'url' | 'manual' | 'telegram' | 'api';
    originalUrl?: string;
    chatId?: string;
    messageId?: string;
  };
}

export interface ProcessingResult {
  success: boolean;
  article?: ProcessedArticle;
  errors?: string[];
  warnings?: string[];
  
  // Статистика
  stats: {
    languagesProcessed: number;
    contentEnhanced: boolean;
    imageGenerated: boolean;
    publishedToWordPress: boolean;
    processingTimeMs: number;
  };
  
  // URLs
  urls?: Record<string, string>;
}

// ========== ОСНОВНОЙ СЕРВИС ==========

class UnifiedArticleService {
  private supportedLanguages = ['en', 'pl', 'de', 'ro', 'cs'];
  
  /**
   * 🎯 ГЛАВНАЯ ФУНКЦИЯ - Обработка статьи из любого источника
   */
  async processArticle(input: ArticleInput): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      console.log('🚀 Начинаем обработку статьи:', {
        source: input.url ? 'URL' : (input.chatId ? 'Telegram' : 'Manual'),
        title: input.title?.substring(0, 50) + '...',
      });

      // 1. ИЗВЛЕЧЕНИЕ И ПОДГОТОВКА КОНТЕНТА
      let articleData = await this.prepareArticleData(input);
      
      // 2. УЛУЧШЕНИЕ КОНТЕНТА (если включено)
      if (input.enhanceContent !== false) {
        try {
          articleData = await this.enhanceArticleContent(articleData);
        } catch (error) {
          warnings.push(`Не удалось улучшить контент: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 3. ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ (если включено)  
      if (input.generateImage !== false) {
        try {
          articleData.image = await this.generateArticleImage(articleData);
        } catch (error) {
          warnings.push(`Не удалось сгенерировать изображение: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 4. ПЕРЕВОД НА ВСЕ ЯЗЫКИ (если включено)
      let translations: Record<string, any> = {};
      if (input.translateToAll !== false) {
        try {
          translations = await this.translateArticle(articleData);
        } catch (error) {
          warnings.push(`Не удалось выполнить переводы: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 5. СОЗДАНИЕ ФИНАЛЬНОГО ОБЪЕКТА СТАТЬИ
      const processedArticle = this.createProcessedArticle(articleData, input, translations);
      
      // 6. СОХРАНЕНИЕ В ЛОКАЛЬНУЮ СИСТЕМУ
      await this.saveArticleLocally(processedArticle);
      
      // 7. ПУБЛИКАЦИЯ В WORDPRESS (если включено)
      let publishedToWordPress = false;
      let urls: Record<string, string> = {};
      
      if (input.publishToWordPress !== false) {
        try {
          const publishResult = await this.publishToWordPress(processedArticle);
          publishedToWordPress = publishResult.success;
          urls = publishResult.urls || {};
          
          if (!publishResult.success) {
            warnings.push(`Не удалось опубликовать в WordPress: ${publishResult.error}`);
          }
        } catch (error) {
          warnings.push(`Ошибка публикации в WordPress: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 8. ФОРМИРОВАНИЕ РЕЗУЛЬТАТА
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        article: processedArticle,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        stats: {
          languagesProcessed: Object.keys(translations).length + 1,
          contentEnhanced: input.enhanceContent !== false,
          imageGenerated: !!processedArticle.image,
          publishedToWordPress,
          processingTimeMs: processingTime
        },
        urls
      };
      
    } catch (error) {
      console.error('❌ Критическая ошибка обработки статьи:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
        warnings,
        stats: {
          languagesProcessed: 0,
          contentEnhanced: false,
          imageGenerated: false,
          publishedToWordPress: false,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }
  
  // ========== МЕТОДЫ ОБРАБОТКИ ==========
  
  /**
   * Подготовка данных статьи из входных данных
   */
  private async prepareArticleData(input: ArticleInput): Promise<any> {
    let title = input.title || '';
    let content = input.content || '';
    let category = input.category || 'tech';
    
    // Если есть URL - извлекаем контент
    if (input.url) {
      try {
        const extracted = await this.extractContentFromUrl(input.url);
        title = extracted.title || title;
        content = extracted.content || content;
        category = extracted.category || category;
      } catch (error) {
        console.error('❌ Критическая ошибка извлечения контента из URL:', error);
        
        // ✅ ИСПРАВЛЕНИЕ: Выбрасываем ошибку вместо создания fallback контента
        // Это предотвратит дальнейшую обработку и публикацию статьи с ошибками
        throw new Error(`Не удалось обработать URL: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
    
    // Проверяем наличие минимальных данных
    if (!title && !content) {
      throw new Error('Отсутствует заголовок и содержимое статьи');
    }
    
    // Если нет заголовка, создаем его из первой строки контента
    if (!title && content) {
      title = content.split('\n')[0].substring(0, 100);
    }
    
    return {
      title,
      content,
      category,
      author: input.author || 'AI Assistant',
      language: input.language || 'ru'
    };
  }
  
  /**
   * Извлечение контента из URL
   */
  private async extractContentFromUrl(url: string): Promise<any> {
    console.log(`🌐 Извлекаем контент из URL: ${url}`);
    
    try {
      // Используем новый сервис парсинга URL
      const extractedContent = await urlParserService.extractContent(url);
      
      return {
        title: extractedContent.title,
        content: extractedContent.content,
        excerpt: extractedContent.excerpt,
        category: extractedContent.category,
        author: extractedContent.author || 'Web Content',
        publishedAt: extractedContent.publishedAt,
        image: extractedContent.image,
        source: extractedContent.source,
        siteName: extractedContent.siteName,
        language: extractedContent.language || 'ru',
        hasError: false // ✅ Успешное извлечение
      };
    } catch (error) {
      console.error('❌ Ошибка извлечения контента из URL:', error);
      
      // ✅ ИСПРАВЛЕНИЕ: НЕ создаем fallback контент, а выбрасываем ошибку
      // Это предотвратит публикацию статей с ошибками извлечения контента
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      // Определяем тип ошибки для более точной обработки
      const isHttpError = errorMessage.includes('403') || errorMessage.includes('404') || errorMessage.includes('HTTP');
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('ENOTFOUND');
      
      throw new Error(`Не удалось извлечь контент с ${url}: ${errorMessage}${
        isHttpError ? ' (Сайт блокирует автоматическое извлечение контента)' :
        isNetworkError ? ' (Проблемы с сетью или URL недоступен)' :
        ' (Ошибка парсинга контента)'
      }`);
    }
  }
  
  /**
   * Определение категории по домену
   */
  private categorizeFromDomain(domain: string): 'ai' | 'apple' | 'games' | 'tech' {
    if (domain.includes('apple') || domain.includes('macrumors') || domain.includes('9to5mac')) return 'apple';
    if (domain.includes('ai') || domain.includes('openai') || domain.includes('anthropic')) return 'ai';
    if (domain.includes('game') || domain.includes('steam') || domain.includes('ign')) return 'games';
    return 'tech';
  }
  
  /**
   * Улучшение контента через AI
   */
  private async enhanceArticleContent(articleData: any): Promise<any> {
    if (!copywritingService.isAvailable()) {
      console.warn('⚠️ Copywriting service недоступен, пропускаем улучшение');
      return articleData;
    }
    
    try {
      const enhanced = await copywritingService.enhanceContent({
        title: articleData.title,
        content: articleData.content,
        category: articleData.category,
        tone: 'professional',
        targetAudience: 'tech-enthusiasts',
        language: articleData.language
      });
      
      return {
        ...articleData,
        title: enhanced.title,
        content: enhanced.content,
        excerpt: enhanced.excerpt,
        tags: enhanced.tags,
        metaDescription: enhanced.metaDescription
      };
    } catch (error) {
      console.error('❌ Ошибка улучшения контента:', error);
      throw error;
    }
  }
  
  /**
   * Генерация изображения для статьи
   */
  private async generateArticleImage(articleData: any): Promise<string> {
    const availability = imageService.getAvailability();
    
    if (!availability.anyService) {
      console.warn('⚠️ Image service недоступен, используем placeholder');
      return `https://picsum.photos/1200/630?random=${Date.now()}`;
    }
    
    try {
      const imageResult = await imageService.getImage({
        title: articleData.title,
        category: articleData.category,
        description: articleData.excerpt,
        style: 'modern',
        preferredSource: 'auto',
        dimensions: { width: 1200, height: 630 }
      });
      
      return imageResult.url;
    } catch (error) {
      console.error('❌ Ошибка генерации изображения:', error);
      throw error;
    }
  }
  
  /**
   * Перевод статьи на все поддерживаемые языки
   */
  private async translateArticle(articleData: any): Promise<Record<string, any>> {
    if (!translationService.isAvailable()) {
      console.warn('⚠️ Translation service недоступен, пропускаем переводы');
      return {};
    }
    
    try {
      const translations = await translationService.translateToAllLanguages({
        title: articleData.title,
        excerpt: articleData.excerpt || articleData.content.substring(0, 200),
        body: articleData.content
      }, [articleData.language]); // Исключаем исходный язык
      
      // Форматируем переводы с добавлением slug'ов
      const formattedTranslations: Record<string, any> = {};
      
      for (const [language, translation] of Object.entries(translations)) {
        if (translation && typeof translation === 'object') {
          const typedTranslation = translation as any;
          formattedTranslations[language] = {
            title: typedTranslation.title || articleData.title,
            content: typedTranslation.body || typedTranslation.content || articleData.content,
            excerpt: typedTranslation.excerpt || articleData.excerpt,
            slug: this.generateSlug(typedTranslation.title || articleData.title)
          };
        }
      }
      
      return formattedTranslations;
    } catch (error) {
      console.error('❌ Ошибка перевода:', error);
      throw error;
    }
  }
  
  /**
   * Создание финального объекта обработанной статьи
   */
  private createProcessedArticle(articleData: any, input: ArticleInput, translations: Record<string, any>): ProcessedArticle {
    const now = new Date().toISOString();
    const articleId = `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: articleId,
      title: articleData.title,
      content: articleData.content,
      excerpt: articleData.excerpt || articleData.content.substring(0, 200) + '...',
      slug: this.generateSlug(articleData.title),
      
      category: articleData.category,
      tags: articleData.tags || [articleData.category],
      author: articleData.author,
      language: articleData.language,
      image: articleData.image,
      metaDescription: articleData.metaDescription,
      
      createdAt: now,
      publishedAt: now,
      
      translations,
      
      source: {
        type: input.url ? 'url' : (input.chatId ? 'telegram' : 'manual'),
        originalUrl: input.url,
        chatId: input.chatId,
        messageId: input.messageId
      }
    };
  }
  
  /**
   * Сохранение статьи в локальной системе
   */
  private async saveArticleLocally(article: ProcessedArticle): Promise<void> {
    try {
      // Сохраняем основную статью
      const mainPost: Post = {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        publishedAt: article.publishedAt || article.createdAt,
        image: article.image || '',
        category: {
          name: article.category,
          slug: article.category
        },
        content: article.content,
        contentHtml: this.formatContentToHtml(article.content)
      };
      
      addRuntimeArticle(mainPost);
      
      // Сохраняем переводы
      for (const [lang, translation] of Object.entries(article.translations)) {
        const translatedPost: Post = {
          ...mainPost,
          slug: translation.slug,
          title: translation.title,
          excerpt: translation.excerpt,
          content: translation.content,
          contentHtml: this.formatContentToHtml(translation.content)
        };
        
        addRuntimeArticle(translatedPost);
      }
      
      console.log(`✅ Статья сохранена локально: ${article.title}`);
    } catch (error) {
      console.error('❌ Ошибка сохранения статьи локально:', error);
      throw error;
    }
  }
  
  /**
   * Публикация в WordPress
   */
  private async publishToWordPress(article: ProcessedArticle): Promise<{success: boolean; urls?: Record<string, string>; error?: string}> {
    try {
      const isAvailable = await wordpressService.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'WordPress API недоступен'
        };
      }
      
      const result = await wordpressService.publishMultilingualArticle({
        id: article.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        slug: article.slug,
        category: article.category,
        tags: article.tags,
        image: article.image || '',
        author: article.author,
        language: article.language,
        metaDescription: article.metaDescription,
        publishedAt: article.publishedAt || article.createdAt
      }, article.translations);
      
      const urls: Record<string, string> = {};
      for (const res of result.results) {
        if (res.success && res.url) {
          urls[res.language] = res.url;
        }
      }
      
      return {
        success: result.success,
        urls: Object.keys(urls).length > 0 ? urls : undefined,
        error: result.success ? undefined : 'Публикация не удалась'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
  
  // ========== УТИЛИТЫ ==========
  
  /**
   * Генерация slug из заголовка
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, '') // Убираем спецсимволы, оставляем кириллицу
      .replace(/\s+/g, '-')     // Пробелы в дефисы
      .replace(/-+/g, '-')      // Множественные дефисы в одинарные
      .trim()                   // Убираем пробелы по краям
      .replace(/^-+|-+$/g, '')  // Убираем дефисы в начале/конце
      .substring(0, 50);
  }
  
  /**
   * Форматирование контента в HTML с поддержкой Markdown
   */
  private formatContentToHtml(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    return content
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => {
        // Заголовки H1-H6
        if (paragraph.startsWith('# ')) {
          return `<h1>${this.escapeHtml(paragraph.substring(2))}</h1>`;
        }
        if (paragraph.startsWith('## ')) {
          return `<h2>${this.escapeHtml(paragraph.substring(3))}</h2>`;
        }
        if (paragraph.startsWith('### ')) {
          return `<h3>${this.escapeHtml(paragraph.substring(4))}</h3>`;
        }
        if (paragraph.startsWith('#### ')) {
          return `<h4>${this.escapeHtml(paragraph.substring(5))}</h4>`;
        }
        
        // Списки (маркированные)
        if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
          const items = paragraph.split('\n- ').map(item => item.startsWith('- ') ? item.substring(2) : item);
          const listItems = items.map(item => `<li>${this.formatInlineElements(item)}</li>`).join('');
          return `<ul>${listItems}</ul>`;
        }
        
        // Нумерованные списки  
        if (paragraph.match(/^\d+\.\s/)) {
          const items = paragraph.split(/\n\d+\.\s/).filter(item => item.trim());
          const firstItem = paragraph.match(/^\d+\.\s(.*)$/)?.[1];
          if (firstItem) items.unshift(firstItem);
          const listItems = items.map(item => `<li>${this.formatInlineElements(item)}</li>`).join('');
          return `<ol>${listItems}</ol>`;
        }
        
        // Цитаты
        if (paragraph.startsWith('> ')) {
          const quote = paragraph.replace(/^>\s?/gm, '');
          return `<blockquote><p>${this.formatInlineElements(quote)}</p></blockquote>`;
        }
        
        // Код блоки
        if (paragraph.startsWith('```')) {
          const lines = paragraph.split('\n');
          const language = lines[0].substring(3).trim();
          const code = lines.slice(1, -1).join('\n');
          const langClass = language ? ` class="language-${language}"` : '';
          return `<pre><code${langClass}>${this.escapeHtml(code)}</code></pre>`;
        }
        
        // Разделители
        if (paragraph.trim() === '---' || paragraph.trim() === '***') {
          return '<hr>';
        }
        
        // Обычные параграфы с inline форматированием
        return `<p>${this.formatInlineElements(paragraph)}</p>`;
      })
      .join('\n');
  }
  
  /**
   * Форматирование inline элементов (жирный, курсив, ссылки, код)
   */
  private formatInlineElements(text: string): string {
    return text
      // Жирный текст **bold**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Курсив *italic*  
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline код `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Ссылки [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Автоматические ссылки
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      // Экранирование HTML в остальном тексте
      .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  /**
   * Экранирование HTML символов
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  /**
   * Проверка доступности всех сервисов
   */
  async checkServicesHealth(): Promise<{
    translation: boolean;
    copywriting: boolean;
    images: boolean;
    wordpress: boolean;
    urlParser: boolean;
  }> {
    const imageAvailability = imageService.getAvailability();
    const wpAvailable = await wordpressService.isAvailable();
    
    return {
      translation: translationService.isAvailable(),
      copywriting: copywritingService.isAvailable(),
      images: imageAvailability.anyService,
      wordpress: wpAvailable,
      urlParser: urlParserService.isAvailable()
    };
  }
}

// Экспортируем синглтон
export const unifiedArticleService = new UnifiedArticleService();
