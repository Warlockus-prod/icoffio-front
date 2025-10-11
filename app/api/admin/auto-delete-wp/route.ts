import { NextRequest, NextResponse } from 'next/server';

/**
 * 🗑️ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ ПРОБЛЕМНЫХ СТАТЕЙ ИЗ WORDPRESS
 * Программно удаляет статьи с русскими заголовками через REST API
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, executeDelete } = body;
    
    // Проверка пароля администратора
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    console.log('🗑️ Starting automatic deletion of problematic WordPress articles...');
    
    // Получаем все статьи из WordPress
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles');
    const data = await response.json();
    
    if (!data.success || !data.articles) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch WordPress articles for deletion'
      });
    }

    // Определяем проблемные статьи
    const problematicPatterns = [
      /статья с сайта/i,
      /контент извлечен/i,
      /это автоматически созданная/i,
      /для тестирования/i,
      /исходный url/i,
      /article from.*techcrunch/i,
      /article from.*wylsa/i,
      /article from.*example/i,
      /ai и автоматизация/i,
      /прорыв в ai/i,
      /нейросети.*революция/i,
      /ai.*edited.*test/i,
      /breakthrough.*test/i,
    ];

    const articlesToDelete = data.articles.filter((article: any) => {
      return problematicPatterns.some(pattern => 
        pattern.test(article.title || '') ||
        pattern.test(article.content || '') ||
        pattern.test(article.excerpt || '')
      ) || 
      // Также удаляем статьи с односложными slug
      ['en', 'ru', 'pl', 'ai', 'test'].includes(article.slug);
    });

    console.log(`Found ${articlesToDelete.length} problematic articles for deletion`);

    if (!executeDelete) {
      // Возвращаем список для подтверждения
      return NextResponse.json({
        success: true,
        action_required: 'confirmation',
        message: `Found ${articlesToDelete.length} problematic articles`,
        articles_to_delete: articlesToDelete.map((article: any) => ({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt?.substring(0, 100) + '...',
          url: `https://app.icoffio.com/en/article/${article.slug}`,
          reason: getDeleteReason(article)
        })),
        confirmation_required: {
          executeDelete: true,
          warning: 'This will permanently delete these articles from WordPress'
        }
      });
    }

    // Выполняем удаление
    const deletionResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const article of articlesToDelete) {
      try {
        console.log(`🗑️ Deleting article: ${article.title} (${article.slug})`);
        
        const deleteResult = await deleteWordPressArticle(article.id, article.slug);
        
        if (deleteResult.success) {
          successCount++;
          deletionResults.push({
            slug: article.slug,
            title: article.title,
            status: 'deleted',
            message: 'Successfully deleted'
          });
        } else {
          errorCount++;
          deletionResults.push({
            slug: article.slug,
            title: article.title,
            status: 'error',
            error: deleteResult.error
          });
        }
      } catch (error) {
        errorCount++;
        deletionResults.push({
          slug: article.slug,
          title: article.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Принудительная ревалидация страниц после удаления
    try {
      await fetch(`${request.nextUrl.origin}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'icoffio_revalidate_2025',
          paths: ['/en/articles', '/pl/articles', '/en', '/pl']
        })
      });
    } catch (revalError) {
      console.warn('Revalidation after deletion failed:', revalError);
    }

    return NextResponse.json({
      success: true,
      message: `Deletion completed: ${successCount} deleted, ${errorCount} errors`,
      results: {
        total_processed: articlesToDelete.length,
        successfully_deleted: successCount,
        errors: errorCount,
        details: deletionResults
      },
      next_steps: [
        'Check the website to confirm articles are removed',
        'Clear any WordPress caches if using caching plugins',
        'Refresh the admin panel to see updated article counts'
      ]
    });

  } catch (error) {
    console.error('Auto delete WordPress articles error:', error);
    return NextResponse.json(
      { 
        error: 'Auto deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function deleteWordPressArticle(postId: string, slug: string) {
  try {
    const wpApiUrl = process.env.WORDPRESS_API_URL;
    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpApiUrl || !wpUsername || !wpPassword) {
      return {
        success: false,
        error: 'WordPress credentials not configured'
      };
    }

    // Формируем Basic Auth заголовок
    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
    
    const deleteResponse = await fetch(`${wpApiUrl}/posts/${postId}?force=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (deleteResponse.ok) {
      const result = await deleteResponse.json();
      console.log(`✅ Successfully deleted WordPress article: ${slug}`);
      return { success: true, result };
    } else {
      const errorText = await deleteResponse.text();
      console.error(`❌ Failed to delete article ${slug}:`, deleteResponse.status, errorText);
      return {
        success: false,
        error: `HTTP ${deleteResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error(`❌ Error deleting WordPress article ${slug}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}

function getDeleteReason(article: any): string {
  if (/статья с сайта/i.test(article.title)) return 'Russian title on English site';
  if (/контент извлечен/i.test(article.content)) return 'Russian test content';
  if (/article from/i.test(article.title)) return 'Test article from domain';
  if (/ai и автоматизация/i.test(article.title)) return 'Russian AI article';
  if (/прорыв в ai/i.test(article.title)) return 'Russian AI content';
  if (['en', 'ru', 'pl'].includes(article.slug)) return 'Invalid single-character slug';
  return 'Pattern match for test/problematic content';
}
