import { NextRequest, NextResponse } from 'next/server';
import { unifiedArticleService } from '@/lib/unified-article-service';

// POST /api/generate-article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, content, category, action } = body;

    // Проверка доступности OpenAI API
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API ключ не настроен',
          message: 'Для генерации статей необходимо настроить OPENAI_API_KEY'
        },
        { status: 503 }
      );
    }

    // Валидация входных данных
    if (!url && !title && action !== 'check-status') {
      return NextResponse.json(
        { error: 'Необходимо указать URL или заголовок с контентом' },
        { status: 400 }
      );
    }

    // Проверка статуса сервиса
    if (action === 'check-status') {
      return NextResponse.json({
        available: Boolean(process.env.OPENAI_API_KEY),
        message: 'Сервис генерации статей готов к работе',
        supportedLanguages: ['en', 'pl', 'de', 'ro', 'cs'],
        supportedCategories: ['ai', 'apple', 'games', 'tech']
      });
    }

    // Подготовка входных данных
    const articleInput: any = {};
    
    if (url) {
      articleInput.url = url;
    } else {
      articleInput.title = title;
      articleInput.content = content;
      articleInput.category = category || 'tech';
    }

    console.log(`🚀 Генерируем статью: ${articleInput.title || articleInput.url}`);

    // Генерация статьи через новый unified service
    const result = await unifiedArticleService.processArticle(articleInput);

    if (!result.success) {
      throw new Error(result.errors?.[0] || 'Ошибка обработки статьи');
    }

    // Статистика для совместимости со старым API
    const stats = {
      title: result.article!.title,
      category: result.article!.category,
      languages: result.stats.languagesProcessed,
      slug: result.article!.slug,
      excerpt: result.article!.excerpt
    };

    // Форматируем posts для совместимости со старым API
    const posts = result.article ? {
      [result.article.language]: {
        slug: result.article.slug,
        title: result.article.title,
        excerpt: result.article.excerpt,
        publishedAt: result.article.publishedAt,
        image: result.article.image,
        category: {
          name: result.article.category || 'tech',
          slug: result.article.category || 'tech'
        },
        content: result.article.content,
        contentHtml: result.article.content
      }
    } : {};

    // Добавляем переводы
    for (const [lang, translation] of Object.entries(result.article?.translations || {})) {
      posts[lang] = {
        slug: translation.slug,
        title: translation.title,
        excerpt: translation.excerpt,
        publishedAt: result.article?.publishedAt,
        image: result.article?.image,
        category: {
          name: result.article?.category || 'tech',
          slug: result.article?.category || 'tech'
        },
        content: translation.content,
        contentHtml: translation.content
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Статья успешно сгенерирована и добавлена',
      data: {
        posts,
        stats,
        input: articleInput
      }
    });

  } catch (error) {
    console.error('❌ Ошибка генерации статьи:', error);
    
    return NextResponse.json(
      { 
        error: 'Ошибка генерации статьи',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/generate-article - информация о сервисе
export async function GET() {
  return NextResponse.json({
    service: 'Article Generator API',
    version: '1.0.0',
    available: Boolean(process.env.OPENAI_API_KEY),
    endpoints: {
      'POST /api/generate-article': {
        'From URL': 'url: string',
        'From text': 'title: string, content: string, category?: string',
        'Check status': 'action: "check-status"'
      }
    },
    supportedLanguages: ['en', 'pl', 'de', 'ro', 'cs'],
    supportedCategories: ['ai', 'apple', 'games', 'tech'],
    examples: {
      fromUrl: {
        url: 'https://example.com/article'
      },
      fromText: {
        title: 'Заголовок статьи',
        content: 'Содержимое статьи...',
        category: 'tech'
      },
      checkStatus: {
        action: 'check-status'
      }
    }
  });
}
