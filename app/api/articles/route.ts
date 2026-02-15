/**
 * 🚀 ЕДИНЫЙ API УПРАВЛЕНИЯ СТАТЬЯМИ ICOFFIO
 * Объединяет функциональность n8n-webhook и generate-article
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedArticleService, type ArticleInput } from '@/lib/unified-article-service';
import { wordpressService } from '@/lib/wordpress-service';
// v7.30.0: Centralized content formatting utility
import { formatContentToHtml, escapeHtml, normalizeAiGeneratedText, sanitizeExcerptText } from '@/lib/utils/content-formatter';
// v8.4.0: Image placement utility
import { placeImagesInContent } from '@/lib/utils/image-placer';
import { injectMonetizationSettingsIntoContent } from '@/lib/monetization-settings';

const DEFAULT_PLACEHOLDER_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';
const isPlaceholderImage = (url?: string): boolean =>
  Boolean(url && url.includes(DEFAULT_PLACEHOLDER_IMAGE_MARKER));

// Поддерживаемые действия
type ActionType = 
  | 'create-from-telegram'  // Для n8n webhook
  | 'create-from-url'       // Для админ панели - парсинг URL
  | 'create-from-text'      // Для админ панели - ручной ввод
  | 'health-check'          // Проверка состояния сервисов
  | 'get-categories'        // Получение доступных категорий
  | 'wordpress-health'      // Диагностика WordPress подключения
  | 'publish-article'       // Публикация готовой статьи
  | 'list-articles'         // Список статей (будущее)
  | 'get-article'           // Получение статьи (будущее)
  | 'update-article'        // Обновление статьи (будущее)
  | 'delete-article';       // Удаление статьи (будущее)

interface ApiRequest {
  action: ActionType;
  data?: any;
  
  // Для совместимости со старыми API
  url?: string;
  title?: string;
  content?: string;
  category?: string;
}

// ========== ОСНОВНЫЕ МЕТОДЫ ==========

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body = await request.json() as ApiRequest;
    const { action, data } = body;

    console.log(`📝 API Articles: ${action}`, {
      hasData: !!data,
      timestamp: new Date().toISOString()
    });

    // Проверка авторизации для определенных действий
    if (['create-from-telegram'].includes(action)) {
      const authResult = await checkAuthentication(request);
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Неавторизованный доступ', details: authResult.error },
          { status: 401 }
        );
      }
    }

    // Маршрутизация по действиям
    switch (action) {
      case 'create-from-telegram':
        return await handleTelegramCreation(data, request);
        
      case 'create-from-url':
        return await handleUrlCreation(body, request);
        
      case 'create-from-text':
        return await handleTextCreation(body, request);
        
      case 'health-check':
        return await handleHealthCheck();
        
      case 'get-categories':
        return await handleGetCategories();

      case 'wordpress-health':
        return await handleWordPressHealth();

      case 'publish-article':
        return await handleArticlePublication(body, request);
        
      default:
        return NextResponse.json(
          { 
            error: 'Неизвестное действие', 
            supportedActions: [
              'create-from-telegram',
              'create-from-url', 
              'create-from-text',
              'health-check',
              'get-categories',
              'wordpress-health',
              'publish-article'
            ]
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ API Articles error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  if (action === 'health-check') {
    return await handleHealthCheck();
  }
  
  if (action === 'categories') {
    return await handleGetCategories();
  }
  
  if (action === 'wordpress-health') {
    return await handleWordPressHealth();
  }
  
  // Документация API
  return NextResponse.json({
    service: 'Unified Articles API',
    version: '2.0.0',
    description: 'Единый API для управления статьями icoffio',
    
    endpoints: {
      'POST /api/articles': {
        'create-from-telegram': {
          description: 'Создание статьи из телеграм сообщения (для n8n)',
          auth: 'Bearer token required',
          data: {
            title: 'string',
            content: 'string', 
            category: 'ai|apple|games|tech (optional)',
            language: 'string (optional, default: ru)',
            author: 'string (optional)',
            chatId: 'string (optional)',
            messageId: 'string (optional)',
          }
        },
        'create-from-url': {
          description: 'Создание статьи из URL (для админ панели)',
          data: {
            url: 'string (required)',
            category: 'ai|apple|games|tech (optional)'
          }
        },
        'create-from-text': {
          description: 'Создание статьи из текста (для админ панели)', 
          data: {
            title: 'string (required)',
            content: 'string (required)',
            category: 'ai|apple|games|tech (optional)'
          }
        },
        'health-check': {
          description: 'Проверка состояния всех сервисов'
        },
        'get-categories': {
          description: 'Получение списка доступных категорий'
        }
      },
      
      'GET /api/articles': {
        'health-check': '?action=health-check',
        'categories': '?action=categories',
        'wordpress-health': '?action=wordpress-health',
        'documentation': 'Default - this help'
      }
    },
    
    compatibility: {
      'n8n-webhook': 'POST /api/articles with action: create-from-telegram',
      'generate-article': 'POST /api/articles with action: create-from-url or create-from-text'
    },
    
    supportedLanguages: ['ru', 'en', 'pl', 'de', 'ro', 'cs'],
    supportedCategories: ['ai', 'apple', 'games', 'tech'],
    
    features: [
      'content-enhancement',
      'multilingual-translation', 
      'image-generation',
      'wordpress-publication',
      'url-content-extraction',
      'telegram-integration',
      'local-storage',
      'health-monitoring'
    ]
  });
}

// ========== ОБРАБОТЧИКИ ДЕЙСТВИЙ ==========

/**
 * Создание статьи из телеграм сообщения (для n8n)
 */
async function handleTelegramCreation(data: any, request: NextRequest) {
  try {
    if (!data || !data.title || !data.content) {
      return NextResponse.json(
        { error: 'Отсутствует заголовок или содержимое статьи' },
        { status: 400 }
      );
    }

    const articleInput: ArticleInput = {
      title: data.title,
      content: data.content,
      category: data.category || 'tech',
      author: data.author || 'AI Assistant',
      language: data.language || 'ru',
      chatId: data.chatId,
      messageId: data.messageId,
      
      // Для телеграм включаем все возможности
      enhanceContent: true,
      generateImage: true,
      translateToAll: true,
      publishToWordPress: true
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
      // Формат ответа для n8n (совместимость)
      return NextResponse.json({
        success: true,
        article: {
          id: result.article!.id,
          slug: result.article!.slug,
          title: result.article!.title,
          content: result.article!.content,
          excerpt: result.article!.excerpt,
          category: result.article!.category,
          language: result.article!.language,
          author: result.article!.author,
          chatId: data.chatId,
          messageId: data.messageId,
          image: result.article!.image,
          publishedAt: result.article!.publishedAt,
          translations: result.article!.translations
        },
        publicationResults: {
          success: result.stats.publishedToWordPress,
          publishedLanguages: Object.keys(result.article!.translations || {}),
          summary: {
            published: result.stats.publishedToWordPress ? result.stats.languagesProcessed : 0,
            failed: result.stats.publishedToWordPress ? 0 : result.stats.languagesProcessed,
            total: result.stats.languagesProcessed
          }
        },
        urls: result.urls,
        stats: result.stats,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: result.warnings
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Telegram creation error:', error);
    throw error;
  }
}

/**
 * Создание статьи из URL (для админ панели)
 */
async function handleUrlCreation(body: ApiRequest & { contentStyle?: string }, request: NextRequest) {
  try {
    const url = body.url || body.data?.url;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL не указан' },
        { status: 400 }
      );
    }

    // ✅ v8.4.0: Получаем стиль обработки контента
    const contentStyle = body.contentStyle || body.data?.contentStyle || 'journalistic';
    const stage = body.data?.stage || (body as any).stage;
    const enhanceContent = typeof (body as any).enhanceContent === 'boolean'
      ? (body as any).enhanceContent
      : typeof body.data?.enhanceContent === 'boolean'
        ? body.data.enhanceContent
        : contentStyle !== 'as-is';
    const generateImage = typeof (body as any).generateImage === 'boolean'
      ? (body as any).generateImage
      : typeof body.data?.generateImage === 'boolean'
        ? body.data.generateImage
        : true;
    const translateToAll = typeof (body as any).translateToAll === 'boolean'
      ? (body as any).translateToAll
      : typeof body.data?.translateToAll === 'boolean'
        ? body.data.translateToAll
        : true;
    console.log(`📝 Content style requested: ${contentStyle}`);

    const articleInput: ArticleInput = {
      url,
      category: body.category || body.data?.category || 'tech',
      contentStyle, // ✅ v8.4.0: Передаем стиль в сервис
      stage,
      
      // Для админ панели - все возможности включены
      enhanceContent,
      generateImage,
      translateToAll,
      publishToWordPress: false // В админке пока отключаем автопубликацию
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
      // ✅ АВТОМАТИЧЕСКАЯ РЕВАЛИДАЦИЯ СТРАНИЦ после создания статьи
      try {
        await fetch(`${request.nextUrl.origin}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            secret: 'icoffio_revalidate_2025',
            paths: ['/en/articles', '/pl/articles', '/en/category/' + result.article!.category, '/pl/category/' + result.article!.category]
          })
        });
      } catch (revalError) {
        console.warn('Revalidation failed:', revalError);
      }

      // Формат ответа для админ панели
      return NextResponse.json({
        success: true,
        message: 'Статья успешно создана из URL',
        data: {
          posts: formatPostsForAdmin(result.article!),
          stats: {
            title: result.article!.title,
            category: result.article!.category,
            languages: result.stats.languagesProcessed,
            slug: result.article!.slug,
            excerpt: result.article!.excerpt
          },
          input: { url }
        },
        // ✅ ИСПРАВЛЕНИЕ: Передаем imageOptions для выбора нескольких картинок
        imageOptions: (result.article as any).imageOptions || undefined,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: result.warnings
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ URL creation error:', error);
    throw error;
  }
}

/**
 * Создание статьи из текста (для админ панели)
 */
async function handleTextCreation(body: ApiRequest, request: NextRequest) {
  try {
    const title = body.title || body.data?.title;
    const content = body.content || body.data?.content;
    const stage = body.data?.stage || (body as any).stage;
    const enhanceContent = typeof (body as any).enhanceContent === 'boolean'
      ? (body as any).enhanceContent
      : typeof body.data?.enhanceContent === 'boolean'
        ? body.data.enhanceContent
        : true;
    const generateImage = typeof (body as any).generateImage === 'boolean'
      ? (body as any).generateImage
      : typeof body.data?.generateImage === 'boolean'
        ? body.data.generateImage
        : true;
    const translateToAll = typeof (body as any).translateToAll === 'boolean'
      ? (body as any).translateToAll
      : typeof body.data?.translateToAll === 'boolean'
        ? body.data.translateToAll
        : true;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Отсутствует заголовок или содержимое' },
        { status: 400 }
      );
    }

    const articleInput: ArticleInput = {
      title,
      content,
      category: body.category || body.data?.category || 'tech',
      stage,
      
      // Для админ панели - все возможности включены
      enhanceContent,
      generateImage,
      translateToAll,
      publishToWordPress: false // В админке пока отключаем автопубликацию
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
      // ✅ АВТОМАТИЧЕСКАЯ РЕВАЛИДАЦИЯ СТРАНИЦ после создания статьи
      try {
        await fetch(`${request.nextUrl.origin}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            secret: 'icoffio_revalidate_2025',
            paths: ['/en/articles', '/pl/articles', '/en/category/' + result.article!.category, '/pl/category/' + result.article!.category]
          })
        });
      } catch (revalError) {
        console.warn('Revalidation failed:', revalError);
      }

      // Формат ответа для админ панели
      return NextResponse.json({
        success: true,
        message: 'Статья успешно создана',
        data: {
          posts: formatPostsForAdmin(result.article!),
          stats: {
            title: result.article!.title,
            category: result.article!.category,
            languages: result.stats.languagesProcessed,
            slug: result.article!.slug,
            excerpt: result.article!.excerpt
          },
          input: { title, content, category: articleInput.category }
        },
        warnings: result.warnings
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Неизвестная ошибка',
        errors: result.errors,
        warnings: result.warnings
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Text creation error:', error);
    throw error;
  }
}

/**
 * Проверка здоровья всех сервисов
 */
async function handleHealthCheck() {
  try {
    const servicesHealth = await unifiedArticleService.checkServicesHealth();
    
    return NextResponse.json({
      success: true,
      service: 'Unified Articles API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      
      services: servicesHealth,
      
      environment: {
        openaiKey: !!process.env.OPENAI_API_KEY,
        unsplashKey: !!process.env.UNSPLASH_ACCESS_KEY,
        wordpressUrl: !!process.env.WORDPRESS_API_URL,
        wordpressAuth: !!(process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD),
        webhookSecret: !!process.env.N8N_WEBHOOK_SECRET
      },
      
      supportedLanguages: ['ru', 'en', 'pl', 'de', 'ro', 'cs'],
      supportedCategories: ['ai', 'apple', 'games', 'tech'],
      
      features: [
        'unified-architecture',
        'telegram-integration', 
        'intelligent-url-parsing',
        'real-content-extraction',
        'manual-content-input',
        'content-enhancement',
        'multilingual-translation',
        'image-generation',
        'wordpress-publication',
        'local-storage',
        'health-monitoring'
      ],
      
      endpoints: {
        telegram: 'POST /api/articles { action: "create-from-telegram" }',
        url: 'POST /api/articles { action: "create-from-url", url: "..." }',
        text: 'POST /api/articles { action: "create-from-text", title: "...", content: "..." }'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Получение доступных категорий
 */
async function handleGetCategories() {
  return NextResponse.json({
    success: true,
    categories: [
      { slug: 'ai', name: 'Искусственный интеллект', icon: '🤖', description: 'ИИ, машинное обучение, нейросети' },
      { slug: 'apple', name: 'Apple', icon: '🍎', description: 'Продукты Apple, iOS, macOS' },
      { slug: 'games', name: 'Игры', icon: '🎮', description: 'Видеоигры, киберспорт, игровая индустрия' },
      { slug: 'tech', name: 'Технологии', icon: '⚡', description: 'Общие технологии, гаджеты, инновации' }
    ]
  });
}

/**
 * Расширенная диагностика WordPress подключения
 */
async function handleWordPressHealth() {
  try {
    const healthStatus = await wordpressService.getHealthStatus();
    
    return NextResponse.json({
      success: true,
      service: 'WordPress Integration',
      timestamp: new Date().toISOString(),
      
      wordpress: healthStatus,
      
      recommendations: [
        ...(healthStatus.available ? [] : ['Проверьте доступность WordPress REST API']),
        ...(healthStatus.details.hasCredentials ? [] : ['Добавьте WORDPRESS_USERNAME и WORDPRESS_APP_PASSWORD в переменные окружения']),
        ...(healthStatus.authenticated ? [] : ['Проверьте правильность учетных данных WordPress']),
        ...(healthStatus.canCreatePosts ? [] : ['Убедитесь, что пользователь имеет права на создание постов']),
        ...(healthStatus.categoriesAvailable ? [] : ['Проверьте доступность категорий WordPress'])
      ],
      
      setup: {
        requiredEnvVars: [
          'WORDPRESS_API_URL',
          'WORDPRESS_USERNAME', 
          'WORDPRESS_APP_PASSWORD'
        ],
        instructions: [
          '1. Войдите в WordPress Admin как администратор',
          '2. Перейдите в "Пользователи → Ваш профиль"',
          '3. В разделе "Application Passwords" создайте новый пароль',
          '4. Скопируйте пароль в WORDPRESS_APP_PASSWORD (не основной пароль!)',
          '5. Убедитесь, что REST API включен: /wp-json/wp/v2/posts'
        ]
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'WordPress health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Проверка аутентификации
 */
async function checkAuthentication(request: NextRequest): Promise<{success: boolean; error?: string}> {
  // Проверка webhook secret для n8n
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return {
        success: false,
        error: 'Invalid webhook secret'
      };
    }
  }
  
  return { success: true };
}

/**
 * Форматирование статей для админ панели
 */
function formatPostsForAdmin(article: any): Record<string, any> {
  const posts: Record<string, any> = {};
  
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Логирование для отладки
  console.log('📋 formatPostsForAdmin - article language:', article.language);
  console.log('📋 formatPostsForAdmin - article title:', article.title?.substring(0, 80));
  console.log('📋 formatPostsForAdmin - translations available:', Object.keys(article.translations || {}));
  
  // Основная статья (всегда EN теперь)
  const normalizedEnContent = normalizeAiGeneratedText(article.content || '');
  const normalizedEnExcerpt = sanitizeExcerptText(article.excerpt || article.title || '', 200);
  posts.en = {
    slug: article.slug,
    title: article.title,
    excerpt: normalizedEnExcerpt,
    publishedAt: article.publishedAt,
    image: article.image,
    category: {
      name: article.category,
      slug: article.category
    },
    content: normalizedEnContent,
    contentHtml: formatContentToHtml(normalizedEnContent)
  };
  
  console.log('📋 posts.en.title:', posts.en.title?.substring(0, 80));
  
  // Переводы (только PL поддерживается)
  for (const [lang, translation] of Object.entries(article.translations || {})) {
    if (lang === 'pl') { // Только польский
      const normalizedPlContent = normalizeAiGeneratedText((translation as any).content || '');
      const normalizedPlExcerpt = sanitizeExcerptText(
        (translation as any).excerpt || (translation as any).title || article.excerpt || '',
        200
      );
      posts[lang] = {
        slug: (translation as any).slug,
        title: (translation as any).title,
        excerpt: normalizedPlExcerpt,
        publishedAt: article.publishedAt,
        image: article.image,
        category: {
          name: article.category,
          slug: article.category
        },
        content: normalizedPlContent,
        contentHtml: formatContentToHtml(normalizedPlContent)
      };
      console.log('📋 posts.pl.title:', posts[lang].title?.substring(0, 80));
    }
  }
  
  console.log('📋 Final posts structure:', Object.keys(posts).join(', '));
  return posts;
}

// ✅ v7.30.0: formatContentToHtml and escapeHtml moved to lib/utils/content-formatter.ts
// This eliminates code duplication - now imported at the top of this file

// ========== ПУБЛИКАЦИЯ СТАТЕЙ ==========

async function handleArticlePublication(body: any, request: NextRequest) {
  try {
    const { articleId, article } = body;

    if (!article) {
      return NextResponse.json(
        { error: 'Статья не предоставлена' },
        { status: 400 }
      );
    }

    console.log(`📤 Publishing article: ${article.title}`);

    // 1. КРИТИЧЕСКИ ВАЖНО: Сохраняем в Supabase для персистентности
    // Runtime storage НЕ работает в serverless (каждый запрос на разных серверах!)
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { addRuntimeArticle } = require('@/lib/local-articles');
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Генерируем slug С СУФФИКСАМИ (система требует!)
    const generateSlug = (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
    };
    
    const rawBaseSlug = article.slug || generateSlug(article.title);
    const baseSlug = rawBaseSlug.replace(/-(en|pl)$/i, '');
    const publishedAt = new Date().toISOString();
    
    console.log(`📤 Publishing article with base slug: ${baseSlug}`);
    
    // ✅ v8.4.0: Расстановка изображений в контенте
    let contentEn = normalizeAiGeneratedText(article.content || '');
    let contentPl = normalizeAiGeneratedText(article.translations?.pl?.content || article.content || '');

    // Normalize image order: prefer first non-placeholder image as hero
    const rawImages: string[] = [];
    if (article.image) rawImages.push(article.image);
    if (article.images && Array.isArray(article.images)) {
      rawImages.push(...article.images);
    }

    const uniqueImages = Array.from(new Set(rawImages.filter((img: string) => Boolean(img && img.trim()))));
    const preferredHeroImage =
      uniqueImages.find((img) => !isPlaceholderImage(img)) || uniqueImages[0] || '';
    const allImages =
      preferredHeroImage
        ? [preferredHeroImage, ...uniqueImages.filter((img) => img !== preferredHeroImage)]
        : [];
    let heroImage = preferredHeroImage || article.image;
    
    if (allImages.length > 0) {
      console.log(`🖼️ Placing ${allImages.length} images in content`);
      
      // Расставляем изображения в английском контенте
      const enResult = placeImagesInContent(contentEn, {
        imageUrls: allImages,
        title: article.title,
        format: 'markdown'
      });
      contentEn = enResult.contentWithImages;
      heroImage = enResult.heroImage || heroImage;
      
      console.log(`🖼️ EN: Hero + ${enResult.placements.length} images placed at ${enResult.placements.join('%, ')}%`);
      
      // Расставляем изображения в польском контенте
      if (article.translations?.pl?.content) {
        const plResult = placeImagesInContent(contentPl, {
          imageUrls: allImages,
          title: article.translations.pl.title || article.title,
          format: 'markdown'
        });
        contentPl = plResult.contentWithImages;
        console.log(`🖼️ PL: Hero + ${plResult.placements.length} images placed`);
      }
    }

    // ✅ v8.6.16: Персональные настройки монетизации для конкретной статьи.
    if (article.monetizationSettings) {
      contentEn = injectMonetizationSettingsIntoContent(contentEn, article.monetizationSettings);
      contentPl = injectMonetizationSettingsIntoContent(contentPl, article.monetizationSettings);
      console.log(
        `💰 Applied custom monetization settings: ${article.monetizationSettings.enabledAdPlacementIds?.length || 0} ad slots, ` +
          `${article.monetizationSettings.enabledVideoPlayerIds?.length || 0} video players`
      );
    }
    
    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем в Supabase для персистентности!
    const enSlug = `${baseSlug}-en`;
    const plSlug = `${baseSlug}-pl`;
    const cleanExcerptEn = sanitizeExcerptText(article.excerpt || article.title, 200);
    const cleanExcerptPl = sanitizeExcerptText(
      article.translations?.pl?.excerpt || article.translations?.pl?.title || cleanExcerptEn,
      200
    );
    
    // Подготовка данных для Supabase
    const supabaseData = {
      chat_id: 0, // Admin panel
      title: article.title,
      slug_en: enSlug,
      slug_pl: plSlug,
      content_en: contentEn,
      content_pl: contentPl,
      excerpt_en: cleanExcerptEn,
      excerpt_pl: cleanExcerptPl,
      image_url: heroImage || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
      category: article.category || 'tech',
      author: article.author || 'AI Editorial Team',
      tags: Array.isArray(article.tags) ? article.tags : ['ai-processed', 'imported'],
      word_count: Math.round((article.content?.split(/\s+/).length || 0)),
      languages: article.translations?.pl ? ['en', 'pl'] : ['en'],
      source: 'admin-panel',
      original_input: article.title,
      meta_description: cleanExcerptEn.substring(0, 160),
      published: true,
      featured: false,
      url_en: `https://app.icoffio.com/en/article/${enSlug}`,
      url_pl: `https://app.icoffio.com/pl/article/${plSlug}`
    };
    
    // Сохраняем в Supabase
    const { data: savedArticle, error: saveError } = await supabase
      .from('published_articles')
      .insert([supabaseData])
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Supabase save error:', saveError);
      throw new Error(`Failed to save to database: ${saveError.message}`);
    }
    
    console.log(`✅ Saved to Supabase: ID ${savedArticle.id}`);
    
    // Также добавляем в runtime для немедленного отображения
    const enPost = {
      slug: enSlug,
      title: article.title,
      excerpt: cleanExcerptEn,
      publishedAt,
      image: heroImage || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
      category: { name: article.category || 'Technology', slug: article.category || 'tech' },
      content: contentEn, // ✅ v8.4.0: Контент с изображениями
      author: article.author || 'AI Editorial Team',
      tags: ['ai-processed', 'imported']
    };
    
    addRuntimeArticle(enPost);
    console.log(`✅ Added EN to runtime: /en/article/${enPost.slug}`);
    
    // Польская версия
    if (article.translations && article.translations.pl) {
      const plPost = {
        slug: plSlug,
        title: article.translations.pl.title,
        excerpt: cleanExcerptPl,
        publishedAt,
        image: heroImage || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
        category: { name: article.category || 'Technology', slug: article.category || 'tech' },
        content: contentPl, // ✅ v8.4.0: Контент с изображениями
        author: article.author || 'AI Editorial Team',
        tags: ['ai-processed', 'imported', 'translated']
      };
      
      addRuntimeArticle(plPost);
      console.log(`✅ Added PL to runtime: /pl/article/${plPost.slug}`);
    }

    // 2. ОПЦИОНАЛЬНО: Пытаемся опубликовать в WordPress (если доступен)
    let wordpressPublished = false;
    try {
      const publicationResult = await wordpressService.publishMultilingualArticle(
        {
          id: article.id || `article-${Date.now()}`,
          title: article.title,
          content: contentEn,
          excerpt: cleanExcerptEn,
          slug: baseSlug, // ✅ ИСПРАВЛЕНО: используем baseSlug
          category: article.category || 'technology',
          tags: ['imported', 'ai-processed'],
          author: article.author || 'Admin',
          language: 'en', // ✅ ИСПРАВЛЕНО: публикуем как EN
          image: heroImage || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
          publishedAt
        },
        article.translations
      );
      
      wordpressPublished = publicationResult.success;
      
      if (publicationResult.success) {
        console.log('✅ Also published to WordPress');
      } else {
        console.warn('⚠️ WordPress publication failed, but article is available locally');
      }
    } catch (wpError) {
      console.warn('⚠️ WordPress unavailable, article published locally only');
    }

    // 3. Возвращаем успешный результат (статья доступна локально)
    return NextResponse.json({
      success: true,
      message: `Article "${article.title}" successfully published`,
      locallyPublished: true,
      wordpressPublished,
      url: `https://app.icoffio.com/en/article/${enSlug}`, // ✅ Ссылка с суффиксом -en
      urls: {
        en: `https://app.icoffio.com/en/article/${enSlug}`, // ✅ slug-name-en
        pl: article.translations?.pl ? `https://app.icoffio.com/pl/article/${plSlug}` : null // ✅ slug-name-pl
      }
    });

  } catch (error) {
    console.error('❌ Publication error:', error);
    
    return NextResponse.json(
      { 
        error: 'Ошибка публикации статьи',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
