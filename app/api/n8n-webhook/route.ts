import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '@/lib/translation-service';
import { copywritingService } from '@/lib/copywriting-service';
import { imageService } from '@/lib/image-service';
import { getSiteBaseUrl } from '@/lib/site-url';

// Интерфейсы для данных
interface TelegramArticle {
  title: string;
  content: string;
  category?: string;
  language?: string;
  author?: string;
  chatId?: string;
  messageId?: string;
}

interface ProcessedArticle extends TelegramArticle {
  id: string;
  slug: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  translations: Record<string, {
    title: string;
    excerpt: string;
    content: string;
    slug: string;
  }>;
}

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = ['en', 'pl', 'de', 'ro', 'cs'];

// Утилита для генерации slug из заголовка
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // убираем спецсимволы
    .replace(/\s+/g, '-')     // пробелы в дефисы
    .replace(/-+/g, '-')      // множественные дефисы в одинарные
    .trim()                   // убираем пробелы по краям
    .replace(/^-+|-+$/g, ''); // убираем дефисы в начале/конце
}

// POST /api/n8n-webhook - DEPRECATED: используйте /api/articles вместо этого
export async function POST(request: NextRequest) {
  console.warn('⚠️ DEPRECATED API: /api/n8n-webhook устарел. Используйте /api/articles вместо этого.');
  
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log('N8N Webhook called:', { action, dataKeys: Object.keys(data || {}) });

    // Проверка авторизации (опционально)
    const authHeader = request.headers.get('Authorization');
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'process-article':
        return await processArticleFromTelegram(data);
        
      case 'health-check':
        return await healthCheck();
        
      case 'get-categories':
        return await getAvailableCategories();
        
      default:
        return NextResponse.json(
          { error: 'Неизвестное действие', supportedActions: ['process-article', 'health-check', 'get-categories'] },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('N8N Webhook error:', error);
    
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

// Обработка статьи из телеграма
async function processArticleFromTelegram(articleData: TelegramArticle) {
  try {
    if (!articleData.title || !articleData.content) {
      return NextResponse.json(
        { error: 'Отсутствует заголовок или содержимое статьи' },
        { status: 400 }
      );
    }

    // 1. Генерируем уникальный ID и slug
    const articleId = `telegram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const baseSlug = generateSlug(articleData.title);

    // 2. Улучшаем контент через копирайтинг
    const enhancedContent = await enhanceContentWithAI(articleData);

    // 3. Генерируем изображение
    const image = await generateOrFetchImage(enhancedContent.title, enhancedContent.category);

    // 4. Переводим на все языки
    const translations = await translateToAllLanguages({
      title: enhancedContent.title,
      excerpt: enhancedContent.excerpt,
      content: enhancedContent.content
    });

    // 5. Создаем финальную статью
    const processedArticle: ProcessedArticle = {
      id: articleId,
      slug: baseSlug,
      title: enhancedContent.title,
      content: enhancedContent.content,
      excerpt: enhancedContent.excerpt,
      category: enhancedContent.category || 'tech',
      language: articleData.language || 'ru',
      author: articleData.author || 'AI Assistant',
      chatId: articleData.chatId,
      messageId: articleData.messageId,
      image: image,
      publishedAt: new Date().toISOString(),
      translations
    };

    // 6. WordPress decommissioned: return explicit status for legacy clients.
    const publicationResults = {
      success: false,
      decommissioned: true,
      error: 'WordPress integration disabled. Use Supabase publication flow.',
      publishedLanguages: [],
      urls: {}
    };

    return NextResponse.json({
      success: true,
      article: processedArticle,
      publicationResults,
      message: `Статья успешно обработана и переведена на ${Object.keys(translations).length} языков`,
      urls: generateArticleUrls(baseSlug)
    });

  } catch (error) {
    console.error('Article processing error:', error);
    throw error;
  }
}

// Улучшение контента через AI
async function enhanceContentWithAI(article: TelegramArticle) {
  try {
    // Используем новый copywriting service
    if (!copywritingService.isAvailable()) {
      console.warn('Copywriting service not available, using original content');
      return {
        title: article.title,
        content: article.content,
        excerpt: article.content.substring(0, 200) + '...',
        category: article.category || 'tech',
        tags: [],
        metaDescription: article.content.substring(0, 160) + '...'
      };
    }

    const enhancedContent = await copywritingService.enhanceContent({
      title: article.title,
      content: article.content,
      category: article.category as any,
      tone: 'professional',
      targetAudience: 'tech-enthusiasts',
      language: 'ru'
    });

    return {
      title: enhancedContent.title,
      content: enhancedContent.content,
      excerpt: enhancedContent.excerpt,
      category: enhancedContent.category,
      tags: enhancedContent.tags,
      metaDescription: enhancedContent.metaDescription
    };

  } catch (error) {
    console.error('Content enhancement error:', error);
    // Возвращаем оригинальный контент в случае ошибки
    return {
      title: article.title,
      content: article.content,
      excerpt: article.content.substring(0, 200) + '...',
      category: article.category || 'tech',
      tags: [],
      metaDescription: article.content.substring(0, 160) + '...'
    };
  }
}

// Генерация или получение изображения
async function generateOrFetchImage(title: string, category: string): Promise<string> {
  try {
    // Используем новый image service
    const imageResult = await imageService.getImage({
      title,
      category: category as any,
      style: 'modern',
      preferredSource: 'auto',
      dimensions: { width: 1200, height: 630 }
    });

    return imageResult.url;

  } catch (error) {
    console.error('Image generation error:', error);
    // Возвращаем placeholder изображение
    return `https://picsum.photos/1200/630?random=${Date.now()}`;
  }
}



// Перевод на все языки
async function translateToAllLanguages(content: { title: string; excerpt: string; content: string }): Promise<Record<string, { title: string; excerpt: string; content: string; slug: string; }>> {
  try {
    if (!translationService.isAvailable()) {
      return {};
    }

    const translations = await translationService.translateToAllLanguages(
      {
        title: content.title,
        excerpt: content.excerpt,
        body: content.content
      },
      ['ru'] // исключаем русский язык так как оригинал на русском
    );

    // Преобразуем результат в нужный формат
    const formattedTranslations: Record<string, { title: string; excerpt: string; content: string; slug: string; }> = {};
    
    for (const [language, translation] of Object.entries(translations)) {
      if (translation && typeof translation === 'object') {
        formattedTranslations[language] = {
          title: (translation as any).title || content.title,
          excerpt: (translation as any).excerpt || content.excerpt,
          content: (translation as any).body || (translation as any).content || content.content,
          slug: generateSlugFromTitle((translation as any).title || content.title)
        };
      }
    }

    return formattedTranslations;
  } catch (error) {
    console.error('Translation error:', error);
    return {};
  }
}

// Генерация slug из заголовка
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s\u0400-\u04FF]/g, '') // Убираем спецсимволы, оставляем кириллицу
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// Генерация URL для статей
function generateArticleUrls(slug: string) {
  const baseUrl = getSiteBaseUrl();
  return {
    en: `${baseUrl}/en/article/${slug}`,
    pl: `${baseUrl}/pl/article/${slug}`,
    de: `${baseUrl}/de/article/${slug}`,
    ro: `${baseUrl}/ro/article/${slug}`,
    cs: `${baseUrl}/cs/article/${slug}`
  };
}

// Проверка здоровья сервиса
async function healthCheck() {
  // Проверяем все сервисы
  const imageAvailability = imageService.getAvailability();

  return NextResponse.json({
    success: true,
    service: 'N8N Integration Webhook',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      translation: translationService.isAvailable(),
      copywriting: copywritingService.isAvailable(),
      imageGeneration: {
        dalle: imageAvailability.dalle,
        unsplash: imageAvailability.unsplash,
        anyService: imageAvailability.anyService
      },
      wordpress: {
        apiAvailable: false,
        authenticated: false,
        decommissioned: true
      }
    },
    environment: {
      openaiKey: !!process.env.OPENAI_API_KEY,
      unsplashKey: !!process.env.UNSPLASH_ACCESS_KEY,
      webhookSecret: !!process.env.N8N_WEBHOOK_SECRET
    },
    supportedLanguages: SUPPORTED_LANGUAGES,
    supportedCategories: ['ai', 'apple', 'games', 'tech'],
    features: [
      'article-processing',
      'content-enhancement',
      'multilingual-translation',
      'image-generation',
      'telegram-integration'
    ]
  });
}

// Получение доступных категорий
async function getAvailableCategories() {
  return NextResponse.json({
    success: true,
    categories: [
      { slug: 'ai', name: 'Искусственный интеллект' },
      { slug: 'apple', name: 'Apple' },
      { slug: 'games', name: 'Игры' },
      { slug: 'tech', name: 'Технологии' }
    ]
  });
}

// GET /api/n8n-webhook - информация о сервисе
export async function GET() {
  return NextResponse.json({
    service: 'N8N Integration Webhook',
    version: '1.0.0',
    endpoints: {
      'POST /api/n8n-webhook': {
        'Process article': {
          action: 'process-article',
          data: {
            title: 'string',
            content: 'string',
            category: 'string (optional)',
            language: 'string (optional, default: ru)',
            author: 'string (optional)',
            chatId: 'string (optional)',
            messageId: 'string (optional)'
          }
        },
        'Health check': { action: 'health-check' },
        'Get categories': { action: 'get-categories' }
      }
    },
    authentication: 'Bearer token in Authorization header (optional)',
    supportedLanguages: SUPPORTED_LANGUAGES
  });
}
