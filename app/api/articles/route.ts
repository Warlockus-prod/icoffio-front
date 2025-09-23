/**
 * 🚀 ЕДИНЫЙ API УПРАВЛЕНИЯ СТАТЬЯМИ ICOFFIO
 * Объединяет функциональность n8n-webhook и generate-article
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedArticleService, type ArticleInput } from '@/lib/unified-article-service';

// Поддерживаемые действия
type ActionType = 
  | 'create-from-telegram'  // Для n8n webhook
  | 'create-from-url'       // Для админ панели - парсинг URL
  | 'create-from-text'      // Для админ панели - ручной ввод
  | 'health-check'          // Проверка состояния сервисов
  | 'get-categories'        // Получение доступных категорий
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
        
      default:
        return NextResponse.json(
          { 
            error: 'Неизвестное действие', 
            supportedActions: [
              'create-from-telegram',
              'create-from-url', 
              'create-from-text',
              'health-check',
              'get-categories'
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
          publishedLanguages: Object.keys(result.article!.translations),
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
async function handleUrlCreation(body: ApiRequest, request: NextRequest) {
  try {
    const url = body.url || body.data?.url;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL не указан' },
        { status: 400 }
      );
    }

    const articleInput: ArticleInput = {
      url,
      category: body.category || body.data?.category || 'tech',
      
      // Для админ панели - все возможности включены
      enhanceContent: true,
      generateImage: true,
      translateToAll: true,
      publishToWordPress: false // В админке пока отключаем автопубликацию
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
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
      
      // Для админ панели - все возможности включены
      enhanceContent: true,
      generateImage: true,
      translateToAll: true,
      publishToWordPress: false // В админке пока отключаем автопубликацию
    };

    const result = await unifiedArticleService.processArticle(articleInput);

    if (result.success) {
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
        'url-content-extraction',
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
  
  // Основная статья
  posts[article.language] = {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    image: article.image,
    category: {
      name: article.category,
      slug: article.category
    },
    content: article.content,
    contentHtml: article.content // TODO: конвертация в HTML
  };
  
  // Переводы
  for (const [lang, translation] of Object.entries(article.translations)) {
    posts[lang] = {
      slug: (translation as any).slug,
      title: (translation as any).title,
      excerpt: (translation as any).excerpt,
      publishedAt: article.publishedAt,
      image: article.image,
      category: {
        name: article.category,
        slug: article.category
      },
      content: (translation as any).content,
      contentHtml: (translation as any).content // TODO: конвертация в HTML
    };
  }
  
  return posts;
}


