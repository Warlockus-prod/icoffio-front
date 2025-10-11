import { NextRequest, NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress-service';

/**
 * 🗑️ УДАЛЕНИЕ СТАТЕЙ ИЗ WORDPRESS
 * Позволяет удалять конкретные статьи по slug
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, password, action } = body;
    
    // Проверка пароля администратора
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'delete_specific':
        return await handleDeleteSpecific(slug);
      
      case 'list_problematic':
        return await handleListProblematic();
        
      case 'bulk_delete_russian':
        return await handleBulkDeleteRussian();
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: delete_specific, list_problematic, bulk_delete_russian' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('WordPress delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDeleteSpecific(slug: string) {
  try {
    if (!slug) {
      return NextResponse.json(
        { error: 'Article slug is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Attempting to delete WordPress article: ${slug}`);
    
    // Получаем информацию о статье
    const articleInfo = await getWordPressArticleInfo(slug);
    
    if (!articleInfo) {
      return NextResponse.json({
        success: false,
        error: `Article with slug '${slug}' not found in WordPress`,
        slug
      });
    }

    // Удаляем статью (пока возвращаем инструкцию для ручного удаления)
    return NextResponse.json({
      success: true,
      message: `Article '${articleInfo.title}' identified for deletion`,
      article: articleInfo,
      manual_deletion_instructions: [
        '1. Login to WordPress Admin',
        '2. Go to Posts → All Posts', 
        '3. Search for: ' + articleInfo.title,
        '4. Move to Trash or Delete Permanently',
        '5. Clear any caches (if using caching plugins)'
      ],
      wordpress_url: `${process.env.WORDPRESS_API_URL?.replace('/wp-json/wp/v2', '')}/wp-admin/edit.php?s=${encodeURIComponent(articleInfo.title)}`
    });

  } catch (error) {
    console.error('Delete specific article error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleListProblematic() {
  try {
    console.log('🔍 Scanning WordPress for problematic articles...');
    
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles');
    const data = await response.json();
    
    if (!data.success || !data.articles) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch WordPress articles'
      });
    }

    const problematicPatterns = [
      /статья с сайта/i,
      /article from.*\.com/i,
      /контент извлечен/i,
      /content extracted/i,
      /это автоматически созданная/i,
      /this is an automatically created/i,
      /для тестирования/i,
      /admin panel testing/i,
      /test.*article/i,
      /тест/i,
      /debug/i,
      /emergency/i,
      /verification/i
    ];

    const problematicArticles = data.articles.filter((article: any) => {
      return problematicPatterns.some(pattern => 
        pattern.test(article.title || '') ||
        pattern.test(article.content || '') ||
        pattern.test(article.excerpt || '')
      );
    });

    return NextResponse.json({
      success: true,
      total_articles: data.articles.length,
      problematic_count: problematicArticles.length,
      problematic_articles: problematicArticles.map((article: any) => ({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt?.substring(0, 100) + '...',
        date: article.date,
        url: `https://app.icoffio.com/en/article/${article.slug}`
      })),
      deletion_api: '/api/admin/delete-wp-article',
      bulk_delete_available: true
    });

  } catch (error) {
    console.error('List problematic articles error:', error);
    return NextResponse.json(
      { error: 'Failed to scan articles' },
      { status: 500 }
    );
  }
}

async function handleBulkDeleteRussian() {
  try {
    console.log('🗑️ Bulk deletion of Russian articles initiated...');
    
    const listResult = await handleListProblematic();
    const listData = await listResult.json();
    
    if (!listData.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get problematic articles list'
      });
    }

    const articlesToDelete = listData.problematic_articles;
    
    return NextResponse.json({
      success: true,
      message: `Found ${articlesToDelete.length} problematic articles for deletion`,
      articles: articlesToDelete,
      bulk_deletion_instructions: [
        'Unfortunately, bulk deletion requires manual WordPress admin access',
        '1. Login to WordPress Admin dashboard',
        '2. Go to Posts → All Posts',
        '3. Use bulk actions to select and delete these articles:',
        ...articlesToDelete.map((a: any) => `   - ${a.title} (${a.slug})`)
      ],
      individual_deletion_available: true,
      use_delete_specific_api: '/api/admin/delete-wp-article with action: delete_specific'
    });

  } catch (error) {
    console.error('Bulk delete Russian articles error:', error);
    return NextResponse.json(
      { error: 'Bulk deletion failed' },
      { status: 500 }
    );
  }
}

async function getWordPressArticleInfo(slug: string) {
  try {
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles');
    const data = await response.json();
    
    if (data.success && data.articles) {
      const article = data.articles.find((a: any) => a.slug === slug);
      return article ? {
        title: article.title,
        slug: article.slug,
        content: article.content?.substring(0, 200) + '...',
        excerpt: article.excerpt,
        date: article.date,
        id: article.id
      } : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting WordPress article info:', error);
    return null;
  }
}
