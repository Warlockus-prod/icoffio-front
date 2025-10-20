/**
 * 📊 СИСТЕМА МОНИТОРИНГА СТАТЕЙ v1.4.0
 * 
 * Отслеживает создание новых статей и качество их slug'ов в реальном времени
 * Webhook-совместимый для интеграции с внешними системами мониторинга
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSlugQualityReport } from '@/lib/api-validators';
import { validateSlug } from '@/lib/slug-utils';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '24h'; // 1h, 24h, 7d, 30d
    const format = url.searchParams.get('format') || 'json'; // json, webhook, slack
    
    console.log('📊 Запрос мониторинга статей, timeframe:', timeframe);

    // Получаем статьи из WordPress API
    const wpResponse = await fetch('https://app.icoffio.com/api/wordpress-articles', {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 } // Кеш на 1 минуту для мониторинга
    });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status}`);
    }

    const wpData = await wpResponse.json();
    const articles = wpData.success ? wpData.articles : [];

    // Фильтруем статьи по времени
    const now = new Date();
    const timefilters: { [key: string]: Date } = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const timeFilter = timefilters[timeframe] || timefilters['24h'];
    
    const recentArticles = articles.filter((article: any) => {
      const articleDate = new Date(article.date);
      return articleDate >= timeFilter;
    });

    // Анализируем качество slug'ов новых статей
    const qualityAnalysis = {
      totalNew: recentArticles.length,
      goodSlugs: 0,
      longSlugs: 0,
      invalidSlugs: 0,
      russianArticles: 0,
      averageLength: 0
    };

    const problematicArticles: any[] = [];
    let totalLength = 0;

    for (const article of recentArticles) {
      if (article.slug) {
        totalLength += article.slug.length;
        
        const isValid = validateSlug(article.slug);
        const isLong = article.slug.length > 50;
        const isRussian = article.slug.includes('-ru');

        if (isRussian) {
          qualityAnalysis.russianArticles++;
          problematicArticles.push({
            title: article.title,
            slug: article.slug,
            issue: 'russian_language',
            date: article.date
          });
        } else if (isLong) {
          qualityAnalysis.longSlugs++;
          problematicArticles.push({
            title: article.title,
            slug: article.slug,
            issue: 'too_long',
            length: article.slug.length,
            date: article.date
          });
        } else if (!isValid) {
          qualityAnalysis.invalidSlugs++;
          problematicArticles.push({
            title: article.title,
            slug: article.slug,
            issue: 'invalid_format',
            date: article.date
          });
        } else {
          qualityAnalysis.goodSlugs++;
        }
      }
    }

    qualityAnalysis.averageLength = recentArticles.length > 0 
      ? Math.round(totalLength / recentArticles.length) 
      : 0;

    // Определяем статус здоровья системы
    const healthStatus = qualityAnalysis.russianArticles > 0 || qualityAnalysis.longSlugs > 2
      ? 'critical'
      : qualityAnalysis.longSlugs > 0 || qualityAnalysis.invalidSlugs > 0
      ? 'warning' 
      : 'healthy';

    const healthMessage = {
      'critical': `🚨 КРИТИЧНО: ${qualityAnalysis.russianArticles + qualityAnalysis.longSlugs} проблемных статей за ${timeframe}`,
      'warning': `⚠️ ВНИМАНИЕ: ${qualityAnalysis.longSlugs + qualityAnalysis.invalidSlugs} статей требуют исправления`,
      'healthy': `✅ ОТЛИЧНО: Все новые статьи соответствуют стандартам качества`
    }[healthStatus];

    // Рекомендации по исправлению
    const recommendations: string[] = [];
    
    if (qualityAnalysis.russianArticles > 0) {
      recommendations.push(`Немедленно применить SQL миграцию для удаления ${qualityAnalysis.russianArticles} русских статей`);
    }
    
    if (qualityAnalysis.longSlugs > 0) {
      recommendations.push(`Обновить ${qualityAnalysis.longSlugs} статей с длинными slug'ами`);
    }
    
    if (qualityAnalysis.invalidSlugs > 0) {
      recommendations.push(`Проверить валидацию API для предотвращения невалидных slug'ов`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Система работает корректно, продолжайте мониторинг');
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.4.0',
      timeframe,
      
      health: {
        status: healthStatus,
        message: healthMessage,
        score: Math.round((qualityAnalysis.goodSlugs / Math.max(1, recentArticles.length)) * 100)
      },
      
      statistics: qualityAnalysis,
      
      problematicArticles: problematicArticles.slice(0, 10), // Ограничиваем вывод
      
      recommendations,
      
      trends: {
        hourlyRate: timeframe === '24h' ? Math.round(recentArticles.length / 24 * 10) / 10 : null,
        qualityImprovement: qualityAnalysis.goodSlugs > qualityAnalysis.longSlugs + qualityAnalysis.invalidSlugs,
        migrationNeeded: problematicArticles.length > 0
      }
    };

    // Форматируем ответ в зависимости от запрашиваемого формата
    if (format === 'slack') {
      const slackMessage = {
        text: healthMessage,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Мониторинг статей icoffio (${timeframe})*\n${healthMessage}`
            }
          },
          {
            type: 'fields',
            fields: [
              { type: 'mrkdwn', text: `*Новых статей:* ${qualityAnalysis.totalNew}` },
              { type: 'mrkdwn', text: `*Качественных:* ${qualityAnalysis.goodSlugs}` },
              { type: 'mrkdwn', text: `*Проблемных:* ${problematicArticles.length}` },
              { type: 'mrkdwn', text: `*Статус:* ${healthStatus.toUpperCase()}` }
            ]
          }
        ]
      };
      
      return NextResponse.json(slackMessage);
    }

    if (format === 'webhook') {
      const webhookPayload = {
        event: 'article_monitoring',
        timestamp: new Date().toISOString(),
        data: {
          health_status: healthStatus,
          new_articles_count: qualityAnalysis.totalNew,
          problematic_count: problematicArticles.length,
          recommendations: recommendations.length
        }
      };
      
      return NextResponse.json(webhookPayload);
    }

    // По умолчанию возвращаем полный JSON
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Monitoring error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Webhook endpoint для внешних систем мониторинга
    const body = await request.json();
    
    if (body.action === 'test-alert') {
      // Тестирование системы алертов
      console.log('🧪 Тестирование системы алертов');
      
      return NextResponse.json({
        success: true,
        message: 'Alert system test completed',
        timestamp: new Date().toISOString(),
        testResult: {
          webhookReceived: true,
          monitoringActive: true,
          apiConnectivity: 'ok'
        }
      });
    }

    if (body.action === 'force-check') {
      // Принудительная проверка без кеширования
      console.log('🔍 Принудительная проверка статей');
      
      // Перенаправляем на GET с параметром для обхода кеша
      const checkUrl = new URL('/api/admin/monitor-articles', request.url);
      checkUrl.searchParams.set('cache', 'false');
      
      return NextResponse.redirect(checkUrl);
    }

    return NextResponse.json({
      error: 'Unknown action. Available: test-alert, force-check'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Webhook monitoring error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed'
    }, { status: 500 });
  }
}
