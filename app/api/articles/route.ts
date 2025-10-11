/**
 * 🚀 ЕДИНЫЙ API УПРАВЛЕНИЯ СТАТЬЯМИ ICOFFIO
 * Объединяет функциональность n8n-webhook и generate-article
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedArticleService, type ArticleInput } from '@/lib/unified-article-service';
import { wordpressService } from '@/lib/wordpress-service';

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
  
  // Основная статья (всегда EN теперь)
  posts.en = {
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
    contentHtml: formatContentToHtml(article.content)
  };
  
  // Переводы (только PL поддерживается)
  for (const [lang, translation] of Object.entries(article.translations)) {
    if (lang === 'pl') { // Только польский
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
        contentHtml: formatContentToHtml((translation as any).content)
      };
    }
  }
  
  return posts;
}

/**
 * Форматирование контента в HTML с поддержкой Markdown (дублируется из UnifiedArticleService)
 */
function formatContentToHtml(content: string): string {
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
        return `<h1>${escapeHtml(paragraph.substring(2))}</h1>`;
      }
      if (paragraph.startsWith('## ')) {
        return `<h2>${escapeHtml(paragraph.substring(3))}</h2>`;
      }
      if (paragraph.startsWith('### ')) {
        return `<h3>${escapeHtml(paragraph.substring(4))}</h3>`;
      }
      if (paragraph.startsWith('#### ')) {
        return `<h4>${escapeHtml(paragraph.substring(5))}</h4>`;
      }
      
      // Списки (маркированные)
      if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
        const items = paragraph.split('\n- ').map(item => item.startsWith('- ') ? item.substring(2) : item);
        const listItems = items.map(item => `<li>${formatInlineElements(item)}</li>`).join('');
        return `<ul>${listItems}</ul>`;
      }
      
      // Нумерованные списки  
      if (paragraph.match(/^\d+\.\s/)) {
        const items = paragraph.split(/\n\d+\.\s/).filter(item => item.trim());
        const firstItem = paragraph.match(/^\d+\.\s(.*)$/)?.[1];
        if (firstItem) items.unshift(firstItem);
        const listItems = items.map(item => `<li>${formatInlineElements(item)}</li>`).join('');
        return `<ol>${listItems}</ol>`;
      }
      
      // Цитаты
      if (paragraph.startsWith('> ')) {
        const quote = paragraph.replace(/^>\s?/gm, '');
        return `<blockquote><p>${formatInlineElements(quote)}</p></blockquote>`;
      }
      
      // Код блоки
      if (paragraph.startsWith('```')) {
        const lines = paragraph.split('\n');
        const language = lines[0].substring(3).trim();
        const code = lines.slice(1, -1).join('\n');
        const langClass = language ? ` class="language-${language}"` : '';
        return `<pre><code${langClass}>${escapeHtml(code)}</code></pre>`;
      }
      
      // Разделители
      if (paragraph.trim() === '---' || paragraph.trim() === '***') {
        return '<hr>';
      }
      
      // Обычные параграфы с inline форматированием
      return `<p>${formatInlineElements(paragraph)}</p>`;
    })
    .join('\n');
}

/**
 * Форматирование inline элементов
 */
function formatInlineElements(text: string): string {
  // Сначала экранируем HTML символы
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Затем применяем markdown форматирование
  return formatted
    // Жирный текст **bold**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Курсив *italic*  
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline код `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Ссылки [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Автоматические ссылки (только если не внутри других тегов)
    .replace(/(?<!href=")(?<!href=&quot;)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Экранирование HTML символов
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Публикуем через WordPress Service
    const publicationResult = await wordpressService.publishMultilingualArticle(
      {
        id: article.id || `article-${Date.now()}`,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        slug: article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        category: article.category || 'technology',
        tags: ['imported', 'ai-processed'],
        author: article.author || 'Admin',
        language: 'ru',
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
        publishedAt: new Date().toISOString()
      },
      article.translations
    );

    if (publicationResult.success) {
      return NextResponse.json({
        success: true,
        message: `Статья "${article.title}" успешно опубликована`,
        results: publicationResult.results,
        summary: publicationResult.summary,
        url: publicationResult.results.find(r => r.success)?.url
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Не удалось опубликовать статью',
          details: publicationResult
        },
        { status: 500 }
      );
    }

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


