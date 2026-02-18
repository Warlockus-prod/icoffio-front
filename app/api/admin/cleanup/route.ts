import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';

/**
 * 🗑️ ADMIN CLEANUP API
 * Очистка тестовых статей и мусорного контента
 */

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'clean_test_articles':
        return await handleCleanTestArticles();
      
      case 'get_cleanup_stats':
        return await handleGetCleanupStats();
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCleanTestArticles() {
  // Возвращаем JavaScript код для выполнения в браузере
  const cleanupCode = `
(function() {
  try {
    const storage = localStorage.getItem('icoffio_admin_articles');
    if (!storage) {
      return { success: true, message: 'No admin articles found', deleted: 0, remaining: 0 };
    }
    
    const articles = JSON.parse(storage);
    console.log('Found', articles.length, 'articles in localStorage');
    
    // Patterns для поиска тестовых статей (русские и английские)
    const testPatterns = [
      /статья с сайта/i,
      /article from/i,
      /test\\s+article/i,
      /тест/i,
      /demo/i,
      /emergency/i,
      /debug/i,
      /quick\\s+test/i,
      /final\\s+test/i,
      /runtime/i,
      /verification/i,
      /контент извлечен/i,
      /content extracted/i,
      /это автоматически созданная/i,
      /this is an automatically created/i,
      /для тестирования/i,
      /admin panel testing/i,
      /techcrunch\\.com/i,
      /example\\.com/i,
      /wylsa\\.com/i,
      /post-deploy/i,
      /language.*fix/i,
      /integration.*test/i
    ];
    
    let deletedCount = 0;
    const cleanedArticles = articles.filter(article => {
      const isTest = testPatterns.some(pattern => 
        pattern.test(article.title) || 
        pattern.test(article.content) || 
        pattern.test(article.excerpt) ||
        pattern.test(article.slug)
      );
      
      if (isTest) {
        console.log('🗑️ Deleting test article:', article.title);
        deletedCount++;
        return false;
      }
      return true;
    });
    
    localStorage.setItem('icoffio_admin_articles', JSON.stringify(cleanedArticles));
    
    return { 
      success: true, 
      message: 'Cleanup completed successfully',
      deleted: deletedCount,
      remaining: cleanedArticles.length
    };
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { success: false, error: error.message };
  }
})();
`;

  return NextResponse.json({
    success: true,
    cleanup_code: cleanupCode,
    instructions: [
      '1. Open web.icoffio.com/en/admin in browser',
      '2. Open Developer Tools (F12)',
      '3. Go to Console tab',
      '4. Paste the cleanup_code and press Enter',
      '5. Check the results in console output'
    ]
  });
}

async function handleGetCleanupStats() {
  const statsCode = `
(function() {
  try {
    const storage = localStorage.getItem('icoffio_admin_articles');
    if (!storage) return { total: 0, test: 0, clean: 0 };
    
    const articles = JSON.parse(storage);
    
    const testPatterns = [
      /статья с сайта/i, /article from/i, /test/i, /тест/i, /demo/i,
      /emergency/i, /debug/i, /runtime/i, /verification/i,
      /контент извлечен/i, /content extracted/i, /techcrunch/i, /example\\.com/i
    ];
    
    let testCount = 0;
    articles.forEach(article => {
      if (testPatterns.some(pattern => 
        pattern.test(article.title) || pattern.test(article.content)
      )) {
        testCount++;
      }
    });
    
    return {
      total: articles.length,
      test: testCount,
      clean: articles.length - testCount
    };
  } catch (error) {
    return { error: error.message };
  }
})();
`;

  return NextResponse.json({
    success: true,
    stats_code: statsCode
  });
}
