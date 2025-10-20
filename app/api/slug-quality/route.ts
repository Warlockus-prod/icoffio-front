/**
 * 📊 API МОНИТОРИНГ КАЧЕСТВА SLUG'ОВ v1.4.0
 * 
 * Эндпоинт для анализа и мониторинга качества slug'ов в системе
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSlugQualityReport, fixProblematicSlug } from '@/lib/api-validators';
import { generateSafeSlug, validateSlug } from '@/lib/slug-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Запрос анализа качества slug\'ов');

    // Получаем статьи из WordPress API
    const wpResponse = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 } // Не кешируем для актуальных данных
    });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status}`);
    }

    const wpData = await wpResponse.json();
    const articles = wpData.success ? wpData.articles : [];

    // Генерируем отчет
    const qualityReport = generateSlugQualityReport(articles);

    // Дополнительная аналитика
    const problematicSlugs = articles.filter((article: any) => 
      article.slug && (article.slug.length > 50 || !validateSlug(article.slug))
    );

    const fixSuggestions = problematicSlugs.map((article: any) => {
      const fix = fixProblematicSlug(article.slug, article.title);
      return {
        originalSlug: article.slug,
        title: article.title,
        ...fix
      };
    });

    // Статистика по языкам
    const languageStats = articles.reduce((stats: any, article: any) => {
      if (article.slug) {
        const langMatch = article.slug.match(/-([a-z]{2})$/);
        const lang = langMatch ? langMatch[1] : 'unknown';
        stats[lang] = (stats[lang] || 0) + 1;
      }
      return stats;
    }, {});

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.4.0',
      
      summary: qualityReport,
      
      details: {
        problematicSlugs: problematicSlugs.length,
        fixSuggestions: fixSuggestions.slice(0, 10), // Ограничиваем вывод
        languageDistribution: languageStats
      },
      
      health: {
        status: qualityReport.longSlugs === 0 && qualityReport.invalidSlugs === 0 ? 'excellent' : 
                qualityReport.longSlugs < 5 && qualityReport.invalidSlugs < 2 ? 'good' : 'needs_attention',
        message: qualityReport.recommendations[0] || 'Качество slug\'ов в норме'
      }
    });

  } catch (error) {
    console.error('❌ Ошибка анализа качества slug\'ов:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка анализа качества slug\'ов',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'test-slug-generation') {
      const testTitle = body.title || 'Test Article Title That Is Very Long And Should Be Truncated Properly';
      
      console.log('🧪 Тестирование генерации slug для:', testTitle);
      
      const safeSlug = generateSafeSlug(testTitle, 45);
      const withLanguage = `${safeSlug}-en`;
      const isValid = validateSlug(withLanguage);
      
      return NextResponse.json({
        success: true,
        test: {
          originalTitle: testTitle,
          originalLength: testTitle.length,
          generatedSlug: withLanguage,
          slugLength: withLanguage.length,
          isValid,
          reduction: `${Math.round((1 - withLanguage.length / testTitle.length) * 100)}%`
        },
        version: '1.4.0'
      });
    }
    
    return NextResponse.json({
      error: 'Неизвестное действие. Доступны: test-slug-generation'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ POST slug-quality error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка тестирования slug\'ов'
    }, { status: 500 });
  }
}
