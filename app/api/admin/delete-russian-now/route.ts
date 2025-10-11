import { NextRequest, NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress-service';

/**
 * 🗑️ НЕМЕДЛЕННОЕ ПРОГРАММНОЕ УДАЛЕНИЕ РУССКИХ СТАТЕЙ
 * Автоматически находит и удаляет все статьи с русскими заголовками
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    
    // Проверка пароля администратора
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    console.log('🗑️ STARTING AUTOMATIC DELETION OF RUSSIAN ARTICLES...');

    // WordPress API credentials
    const wpApiUrl = process.env.WORDPRESS_API_URL;
    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpApiUrl || !wpUsername || !wpPassword) {
      return NextResponse.json({
        error: 'WordPress credentials not configured',
        details: {
          wpApiUrl: !!wpApiUrl,
          wpUsername: !!wpUsername,
          wpPassword: !!wpPassword
        }
      });
    }

    // Получаем все статьи из WordPress
    console.log('📊 Fetching all WordPress articles...');
    const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
    
    const fetchResponse = await fetch(`${wpApiUrl}/posts?per_page=100&status=publish,draft,private`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (!fetchResponse.ok) {
      return NextResponse.json({
        error: `Failed to fetch WordPress posts: ${fetchResponse.status}`,
        details: await fetchResponse.text()
      });
    }

    const allPosts = await fetchResponse.json();
    console.log(`📊 Found ${allPosts.length} total WordPress posts`);

    // Определяем русские и тестовые статьи для удаления
    const russianPatterns = [
      /статья с сайта/i,
      /контент извлечен/i, 
      /это автоматически созданная/i,
      /для тестирования/i,
      /исходный url/i,
      /прорыв в ai/i,
      /ai и автоматизация/i,
      /нейросети.*революция/i,
      /революция.*ai/i,
      /искусственный интеллект/i,
      /article from techcrunch/i,
      /article from wylsa/i,
      /article from example/i
    ];

    const postsToDelete = allPosts.filter((post: any) => {
      const title = post.title?.rendered || '';
      const content = post.content?.rendered || '';
      const excerpt = post.excerpt?.rendered || '';
      
      return russianPatterns.some(pattern => 
        pattern.test(title) ||
        pattern.test(content) ||
        pattern.test(excerpt)
      ) || ['en', 'ru', 'test'].includes(post.slug);
    });

    console.log(`🎯 Found ${postsToDelete.length} Russian/test posts to delete:`);
    postsToDelete.forEach((post: any) => {
      console.log(`   - "${post.title?.rendered}" (${post.slug})`);
    });

    if (postsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Russian or test posts found',
        total_posts: allPosts.length,
        deleted: 0
      });
    }

    // УДАЛЯЕМ ВСЕ ПРОБЛЕМНЫЕ СТАТЬИ
    const deleteResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const post of postsToDelete) {
      try {
        console.log(`🗑️ Deleting: "${post.title?.rendered}" (ID: ${post.id})`);
        
        const deleteResponse = await fetch(`${wpApiUrl}/posts/${post.id}?force=true`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        });

        if (deleteResponse.ok) {
          const deleteData = await deleteResponse.json();
          successCount++;
          deleteResults.push({
            id: post.id,
            title: post.title?.rendered,
            slug: post.slug,
            status: 'deleted',
            message: 'Successfully deleted from WordPress'
          });
          console.log(`✅ Deleted: ${post.title?.rendered}`);
        } else {
          const errorText = await deleteResponse.text();
          errorCount++;
          deleteResults.push({
            id: post.id,
            title: post.title?.rendered,
            slug: post.slug,
            status: 'error',
            error: `HTTP ${deleteResponse.status}: ${errorText}`
          });
          console.log(`❌ Failed to delete: ${post.title?.rendered}`);
        }
      } catch (error) {
        errorCount++;
        deleteResults.push({
          id: post.id,
          title: post.title?.rendered,
          slug: post.slug,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`❌ Error deleting: ${post.title?.rendered}`, error);
      }
      
      // Small delay between deletions
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Deletion completed: ${successCount} success, ${errorCount} errors`);

    // Принудительная ревалидация всех страниц
    try {
      await fetch(`${request.nextUrl.origin}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'icoffio_revalidate_2025',
          paths: ['/en/articles', '/pl/articles', '/en', '/pl', '/en/category/tech', '/pl/category/tech']
        })
      });
      console.log('🔄 Pages revalidated after deletion');
    } catch (revalError) {
      console.warn('Revalidation failed:', revalError);
    }

    return NextResponse.json({
      success: true,
      message: `🗑️ DELETION COMPLETED! Removed ${successCount} Russian/test articles`,
      results: {
        total_posts_scanned: allPosts.length,
        posts_to_delete: postsToDelete.length,
        successfully_deleted: successCount,
        deletion_errors: errorCount,
        specific_target: postsToDelete.find((p: any) => p.slug === 'techcrunch-com-en') ? 'techcrunch-com-en DELETED' : 'techcrunch-com-en not found'
      },
      deleted_articles: deleteResults.filter(r => r.status === 'deleted'),
      errors: deleteResults.filter(r => r.status === 'error'),
      next_steps: [
        'Russian articles have been permanently deleted from WordPress',
        'Pages have been automatically revalidated',
        'Check the website - Russian titles should be gone',
        'Clear WordPress cache if using caching plugins'
      ]
    });

  } catch (error) {
    console.error('❌ Auto deletion failed:', error);
    return NextResponse.json(
      { 
        error: 'Programmatic deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
