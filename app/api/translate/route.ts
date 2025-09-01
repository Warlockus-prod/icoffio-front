import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '@/lib/translation-service';

// POST /api/translate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, targetLanguage, contentType, action } = body;

    // Валидация входных данных
    if (!content && action !== 'check-availability') {
      return NextResponse.json(
        { error: 'Контент для перевода не предоставлен' },
        { status: 400 }
      );
    }

    // Проверка доступности сервиса
    if (action === 'check-availability') {
      return NextResponse.json({
        available: translationService.isAvailable(),
        message: translationService.isAvailable() 
          ? 'Сервис перевода доступен'
          : 'OpenAI API ключ не настроен'
      });
    }

    // Проверка наличия API ключа
    if (!translationService.isAvailable()) {
      return NextResponse.json(
        { 
          error: 'Сервис перевода недоступен',
          message: 'OpenAI API ключ не настроен в переменных окружения'
        },
        { status: 503 }
      );
    }

    // Массовый перевод статьи
    if (action === 'translate-article') {
      const { title, excerpt, body, excludeLanguages } = content;
      
      if (!title && !excerpt && !body) {
        return NextResponse.json(
          { error: 'Нет контента для перевода' },
          { status: 400 }
        );
      }

      const articleContent = { title: title || '', excerpt: excerpt || '', body: body || '' };
      const translations = await translationService.translateToAllLanguages(
        articleContent, 
        excludeLanguages || []
      );

      return NextResponse.json({
        success: true,
        translations,
        message: `Статья переведена на ${Object.keys(translations).length} языков`
      });
    }

    // Обычный перевод текста
    if (!targetLanguage) {
      return NextResponse.json(
        { error: 'Целевой язык не указан' },
        { status: 400 }
      );
    }

    const result = await translationService.translateText({
      content,
      targetLanguage,
      contentType: contentType || 'body'
    });

    return NextResponse.json({
      success: true,
      result,
      message: 'Перевод выполнен успешно'
    });

  } catch (error) {
    console.error('Ошибка API перевода:', error);
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/translate - проверка статуса
export async function GET() {
  return NextResponse.json({
    service: 'Translation API',
    version: '1.0.0',
    available: translationService.isAvailable(),
    supportedLanguages: ['en', 'pl', 'de', 'ro', 'cs'],
    endpoints: {
      'POST /api/translate': {
        'Single text': 'content: string, targetLanguage: string, contentType?: title|excerpt|body',
        'Whole article': 'action: translate-article, content: {title, excerpt, body}, excludeLanguages?: string[]',
        'Check availability': 'action: check-availability'
      }
    }
  });
}
