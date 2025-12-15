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
import { formatContentToHtml } from './utils/content-formatter';
import { getPromptTemplateByStyle, type ContentProcessingStyle } from './config/content-prompts';
import type { Post } from './types';

// ========== ИНТЕРФЕЙСЫ ==========

// ✅ v8.4.0: Стили обработки контента
export type ContentStyleType = 'journalistic' | 'as-is' | 'seo-optimized' | 'academic' | 'casual' | 'technical';

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
  
  // ✅ v8.4.0: Стиль обработки контента
  contentStyle?: ContentStyleType;
  
  // ✨ NEW: Staged processing
  stage?: 'text-only' | 'full'; // 'text-only' = только текст без изображений
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
  
  // ✨ NEW: Staged processing
  processingStage?: 'text' | 'image-selection' | 'final';
  
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
      
      // 2. УЛУЧШЕНИЕ КОНТЕНТА (v8.4.0: включено с поддержкой стилей)
      if (input.enhanceContent !== false && input.contentStyle !== 'as-is') {
        try {
          console.log(`📝 Enhancing content with style: ${input.contentStyle || 'journalistic'}`);
          articleData = await this.enhanceArticleContent(articleData, input.contentStyle);
        } catch (error: any) {
          console.warn(`⚠️ Content enhancement failed, using original: ${error.message}`);
          warnings.push(`Failed to enhance content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`📝 Skipping content enhancement (style: ${input.contentStyle || 'not set'})`);
      }
      
      // 3. ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ (пропускаем если stage === 'text-only')
      // ✅ ИСПРАВЛЕНИЕ: Генерируем множественные опции изображений для выбора админом
      let imageOptions: { unsplash: any[]; aiGenerated: any[] } | undefined;
      
      if (input.generateImage !== false && input.stage !== 'text-only') {
        try {
          console.log('🎨 Generating image options (3 Unsplash)...');
          
          // Импортируем генератор опций изображений
          const { generateImageOptions } = require('./image-options-generator');
          
          // Генерируем 3 варианта из Unsplash (без AI для ускорения)
          imageOptions = await generateImageOptions(
            {
              title: articleData.title,
              category: articleData.category,
              excerpt: articleData.excerpt
            },
            {
              unsplashCount: 3,  // ✅ 3 картинки из Unsplash
              aiCount: 0         // Отключаем AI генерацию (долго и дорого)
            }
          );
          
          // Автоматически выбираем первую картинку как временную
          if (imageOptions && imageOptions.unsplash.length > 0) {
            articleData.image = imageOptions.unsplash[0].url;
            console.log('✅ Auto-selected first Unsplash image');
          } else {
            // Fallback если Unsplash не доступен
            const categoryImages = {
              ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
              apple: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
              tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop',
              games: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&h=630&fit=crop'
            };
            const categoryType = articleData.category as keyof typeof categoryImages;
            articleData.image = categoryImages[categoryType] || categoryImages.tech;
            console.log('⚠️ Using fallback image (Unsplash unavailable)');
          }
          
          console.log(`✅ Generated ${imageOptions?.unsplash.length || 0} Unsplash image options`);
        } catch (error: any) {
          console.error('❌ Failed to generate image options:', error);
          warnings.push(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Fallback изображение
          articleData.image = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=630&fit=crop';
        }
      }
      
      // 4. ПЕРЕВОД НА АНГЛИЙСКИЙ И ПОЛЬСКИЙ (ВСЕГДА ОБА ЯЗЫКА)
      let translations: Record<string, any> = {};
      let finalArticleData = articleData; // По умолчанию используем оригинал
      
      if (input.translateToAll !== false) {
        try {
          console.log('🌍 Starting EN + PL translation process...');
          const baseSlug = this.generateSlug(articleData.title);
          
          if (!translationService.isAvailable()) {
            console.warn('⚠️ Translation service unavailable, using fallback');
            warnings.push('Translation service unavailable - using original content');
            translations = {
              pl: {
                title: articleData.title + ' (PL)',
                content: articleData.content,
                excerpt: articleData.excerpt || articleData.title.substring(0, 100),
                slug: `${baseSlug}-pl` // ✅ С суффиксом
              }
            };
          } else {
            // Определяем исходный язык
            const sourceLanguage = translationService.detectLanguage(articleData.content);
            console.log(`🔍 Detected source language: ${sourceLanguage}`);
            console.log(`📊 Original title: "${articleData.title.substring(0, 80)}..."`);
            console.log(`📊 Original content length: ${articleData.content.length} chars`);
            
            const needsEnTranslation = sourceLanguage !== 'en';
            const needsPlTranslation = sourceLanguage !== 'pl';
            
            console.log(`🔄 Translation needed: EN=${needsEnTranslation}, PL=${needsPlTranslation}`);
            
            // ПЕРЕВОДИМ НА АНГЛИЙСКИЙ (если нужно)
            if (needsEnTranslation) {
              console.log('📝 Translating to English (will become primary article)...');
              const [enTitle, enContent, enExcerpt] = await Promise.all([
                translationService.translateText({
                  content: articleData.title,
                  targetLanguage: 'en',
                  contentType: 'title'
                }),
                translationService.translateText({
                  content: articleData.content,
                  targetLanguage: 'en',
                  contentType: 'body'
                }),
                translationService.translateText({
                  content: articleData.excerpt || articleData.title.substring(0, 150),
                  targetLanguage: 'en',
                  contentType: 'excerpt'
                })
              ]);
              
              finalArticleData = {
                ...articleData,
                title: enTitle.translatedText,
                content: enContent.translatedText,
                excerpt: enExcerpt.translatedText,
                language: 'en' // ✅ КРИТИЧНО: Устанавливаем язык в 'en'!
              };
              console.log('✅ English translation completed (now primary, language=en)');
              console.log(`📊 EN title: "${enTitle.translatedText.substring(0, 80)}..."`);
              console.log(`📊 EN content length: ${enContent.translatedText.length} chars`);
            }
            
            // ПЕРЕВОДИМ НА ПОЛЬСКИЙ (всегда нужен)
            if (needsPlTranslation) {
              console.log('📝 Translating to Polish...');
              const [plTitle, plContent, plExcerpt] = await Promise.all([
                translationService.translateText({
                  content: finalArticleData.title,
                  targetLanguage: 'pl',
                  contentType: 'title'
                }),
                translationService.translateText({
                  content: finalArticleData.content,
                  targetLanguage: 'pl',
                  contentType: 'body'
                }),
                translationService.translateText({
                  content: finalArticleData.excerpt || finalArticleData.title.substring(0, 150),
                  targetLanguage: 'pl',
                  contentType: 'excerpt'
                })
              ]);
              
              translations.pl = {
                title: plTitle.translatedText,
                content: plContent.translatedText,
                excerpt: plExcerpt.translatedText,
                slug: `${baseSlug}-pl` // ✅ ИСПРАВЛЕНО: Добавляем суффикс -pl (система требует!)
              };
              console.log('✅ Polish translation completed');
              console.log(`📊 PL title: "${plTitle.translatedText.substring(0, 80)}..."`);
            } else {
              translations.pl = {
                title: articleData.title,
                content: articleData.content,
                excerpt: articleData.excerpt || articleData.title.substring(0, 100),
                slug: `${baseSlug}-pl` // ✅ ИСПРАВЛЕНО: Добавляем суффикс -pl
              };
              console.log('✅ Source is already Polish, using original');
            }
            
            console.log(`✅ Final result: EN (primary) + PL (translation)`);
          }
        } catch (error: any) {
          console.error('❌ Translation failed:', error);
          warnings.push(`Failed to create translations: ${error instanceof Error ? error.message : 'Unknown error'}`);
          const baseSlug = this.generateSlug(articleData.title);
          translations = {
            pl: {
              title: articleData.title,
              content: articleData.content,
              excerpt: articleData.excerpt || articleData.title.substring(0, 100),
              slug: `${baseSlug}-pl` // ✅ ИСПРАВЛЕНО: С суффиксом -pl
            }
          };
        }
      }
      
      // Используем финальную (возможно переведенную на EN) версию как основную статью
      articleData = finalArticleData;
      
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно устанавливаем язык в 'en'
      // После перевода на английский, основная статья ВСЕГДА английская
      articleData.language = 'en';
      console.log('✅ Primary article language set to EN');
      
      // 5. СОЗДАНИЕ ФИНАЛЬНОГО ОБЪЕКТА СТАТЬИ
      const processedArticle = this.createProcessedArticle(articleData, input, translations);
      
      // ✅ ИСПРАВЛЕНИЕ: Добавляем imageOptions в статью для выбора админом
      if (imageOptions && (imageOptions.unsplash.length > 0 || imageOptions.aiGenerated.length > 0)) {
        (processedArticle as any).imageOptions = imageOptions;
        console.log(`✅ Article has ${imageOptions.unsplash.length + imageOptions.aiGenerated.length} image options available for selection`);
      }
      
      // 6. СОХРАНЕНИЕ В ЛОКАЛЬНУЮ СИСТЕМУ (включая рантайм для сайта)
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
            warnings.push(`Failed to publish to WordPress: ${publishResult.error}`);
          }
        } catch (error: any) {
          warnings.push(`WordPress publication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          languagesProcessed: Object.keys(translations).length + 1, // EN + PL = 2 языка максимум
          contentEnhanced: input.enhanceContent !== false,
          imageGenerated: !!processedArticle.image,
          publishedToWordPress,
          processingTimeMs: processingTime
        },
        urls
      };
      
    } catch (error) {
      console.error('❌ Critical article processing error:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
    
    // Если есть URL - извлекаем РЕАЛЬНЫЙ контент через парсер
    if (input.url) {
      try {
        console.log(`🌐 Parsing content from URL: ${input.url}`);
        const extractedContent = await this.extractContentFromUrl(input.url);
        
        title = extractedContent.title || title;
        content = extractedContent.content || content;
        category = input.category || extractedContent.category || this.categorizeFromDomain(new URL(input.url).hostname);
        
        console.log(`✅ Successfully extracted content:`, {
          title: title.substring(0, 50) + '...',
          contentLength: content.length,
          category
        });
      } catch (error) {
        console.error('❌ Critical error extracting content from URL:', error);
        throw new Error(`Failed to parse URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Check for minimum required data
    if (!title && !content) {
      throw new Error('Missing article title and content');
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
   * Улучшение контента через AI с выбранным стилем
   * v8.4.0: Поддержка разных стилей из Content Prompts
   */
  private async enhanceArticleContent(articleData: any, contentStyle?: ContentStyleType): Promise<any> {
    if (!copywritingService.isAvailable()) {
      console.warn('⚠️ Copywriting service недоступен, пропускаем улучшение');
      return articleData;
    }
    
    try {
      // ✅ v8.4.0: Получаем промпт для выбранного стиля
      const styleTemplate = getPromptTemplateByStyle(contentStyle as ContentProcessingStyle || 'journalistic');
      const tone = this.mapStyleToTone(contentStyle);
      
      console.log(`📝 Using style: ${styleTemplate?.name || 'journalistic'}`);
      
      const enhanced = await copywritingService.enhanceContent({
        title: articleData.title,
        content: articleData.content,
        category: articleData.category,
        tone,
        targetAudience: 'tech-enthusiasts',
        language: articleData.language,
        // ✅ v8.4.0: Передаем системный промпт из шаблона
        systemPrompt: styleTemplate?.systemPrompt
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
   * Маппинг стиля контента на тон для copywritingService
   */
  private mapStyleToTone(style?: ContentStyleType): 'professional' | 'casual' | 'technical' | 'news' {
    switch (style) {
      case 'casual': return 'casual';
      case 'technical': return 'technical';
      case 'academic': return 'professional';
      case 'seo-optimized': return 'professional';
      case 'journalistic': return 'news';
      default: return 'professional';
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
    const baseSlug = this.generateSlug(articleData.title);
    
    return {
      id: articleId,
      title: articleData.title,
      content: articleData.content,
      excerpt: articleData.excerpt || articleData.content.substring(0, 200) + '...',
      slug: `${baseSlug}-en`, // ✅ ИСПРАВЛЕНО: С суффиксом -en для основной статьи!
      
      category: articleData.category,
      tags: articleData.tags || [articleData.category],
      author: articleData.author,
      language: 'en', // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: основной язык EN
      image: articleData.image,
      metaDescription: articleData.metaDescription,
      
      createdAt: now,
      publishedAt: now,
      
      translations,
      
      // ✨ FIXED: Правильная логика staged processing
      processingStage: input.stage === 'text-only' ? 'text' : (input.generateImage !== false ? 'text' : 'final'),
      
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
      // Сохраняем основную статью (EN с суффиксом -en)
      const mainPost: Post = {
        slug: article.slug, // Уже содержит -en суффикс
        title: article.title,
        excerpt: article.excerpt,
        publishedAt: article.publishedAt || article.createdAt,
        image: article.image || '',
        category: {
          name: article.category,
          slug: article.category
        },
        content: article.content,
        contentHtml: formatContentToHtml(article.content),
        author: article.author || 'AI Editorial Team', // ✅ ИСПРАВЛЕНО: Добавлен author
        tags: article.tags?.map(tag => ({ name: tag, slug: tag })) || [] // ✅ ИСПРАВЛЕНО: Добавлены tags
      };
      
      addRuntimeArticle(mainPost);
      console.log(`✅ Saved EN article: ${mainPost.slug}`);
      console.log(`   Title: ${mainPost.title.substring(0, 60)}...`);
      console.log(`   Content length: ${mainPost.content?.length || 0} chars`);
      
      // Сохраняем переводы (PL с суффиксом -pl)
      for (const [lang, translation] of Object.entries(article.translations)) {
        const translatedPost: Post = {
          slug: translation.slug, // Уже содержит -pl суффикс
          title: translation.title,
          excerpt: translation.excerpt,
          publishedAt: article.publishedAt || article.createdAt,
          image: article.image || '',
          category: {
            name: article.category,
            slug: article.category
          },
          content: translation.content,
          contentHtml: formatContentToHtml(translation.content),
          author: article.author || 'AI Editorial Team', // ✅ ИСПРАВЛЕНО
          tags: article.tags?.map(tag => ({ name: tag, slug: tag })) || [] // ✅ ИСПРАВЛЕНО
        };
        
        addRuntimeArticle(translatedPost);
        console.log(`✅ Saved ${lang.toUpperCase()} article: ${translatedPost.slug}`);
        console.log(`   Title: ${translatedPost.title.substring(0, 60)}...`);
        console.log(`   Content length: ${translatedPost.content?.length || 0} chars`);
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
    // Транслитерация кириллицы в латиницу
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
      'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
      'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts',
      'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    // Транслитерируем кириллицу
    let slug = title.split('').map(char => translitMap[char] || char).join('');
    
    // Создаем slug только из латинских символов и цифр
    slug = slug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // ✅ ТОЛЬКО латинские символы и цифры
      .replace(/\s+/g, '-')         // Пробелы в дефисы
      .replace(/-+/g, '-')          // Множественные дефисы в одинарные
      .trim()                       // Убираем пробелы по краям
      .replace(/^-+|-+$/g, '')      // Убираем дефисы в начале/конце
      .substring(0, 60);            // Увеличил лимит до 60 символов
    
    // Если после транслитерации slug пустой (были только спецсимволы), генерируем fallback
    if (!slug || slug.length < 3) {
      slug = `article-${Date.now().toString(36)}`;
    }
    
    return slug;
  }
  
  // ✅ v7.30.0: formatContentToHtml moved to lib/utils/content-formatter.ts
  // This eliminates duplication between unified-article-service and api/articles/route.ts
  
  /**
   * Простые переводы заголовков (временное решение)
   */
  private translateTitle(title: string, language: 'pl'): string {
    // Простые переводы ключевых слов для польского
    const translations: Record<string, string> = {
      'Apple': 'Apple',
      'iPhone': 'iPhone', 
      'AI': 'AI',
      'Tech': 'Technika',
      'Game': 'Gra',
      'Review': 'Recenzja',
      'Guide': 'Przewodnik',
      'News': 'Wiadomości',
      'Update': 'Aktualizacja',
      'Features': 'Funkcje'
    };

    let translated = title;
    Object.entries(translations).forEach(([en, pl]) => {
      translated = translated.replace(new RegExp(en, 'gi'), pl);
    });

    return translated;
  }

  /**
   * Простые переводы контента (временное решение)
   */
  private translateContent(content: string, language: 'pl'): string {
    return content + '\n\n[Przetłumaczone automatycznie na język polski]';
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
