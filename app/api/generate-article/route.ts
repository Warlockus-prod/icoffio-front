import { NextRequest, NextResponse } from 'next/server';
import { articleGenerator } from '@/lib/article-generator';

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

    // Генерация статьи на всех языках
    const posts = await articleGenerator.processArticle(articleInput);
    
    // Добавление в локальную систему
    await articleGenerator.addArticleToSystem(posts);

    // Статистика
    const stats = {
      title: posts.ru?.title || posts.en?.title || 'Без названия',
      category: posts.ru?.category || posts.en?.category,
      languages: Object.keys(posts).length,
      slug: posts.ru?.slug || posts.en?.slug,
      excerpt: posts.ru?.excerpt || posts.en?.excerpt
    };

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
