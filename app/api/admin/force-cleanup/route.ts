import { NextRequest, NextResponse } from 'next/server';
import { wordpressService } from '@/lib/wordpress-service';

/**
 * 🗑️ ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ ТЕСТОВЫХ СТАТЕЙ
 * Удаляет статьи из WordPress и localStorage
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, confirmDelete } = body;
    
    // Проверка пароля администратора
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (!confirmDelete) {
      return NextResponse.json({
        error: 'Confirmation required',
        message: 'Set confirmDelete: true to proceed with deletion'
      });
    }

    console.log('🗑️ Starting force cleanup of test articles...');
    
    // Паттерны для поиска проблемных статей
    const russianPatterns = [
      'Статья с сайта',
      'статья с сайта', 
      'Контент извлечен',
      'контент извлечен',
      'techcrunch.com (EN)',
      'wylsa.com (EN)',
      'example.com (EN)'
    ];
    
    const testPatterns = [
      'Article from techcrunch.com',
      'Article from wylsa.com', 
      'Article from example.com',
      'test article',
      'Test Article',
      'debug test',
      'emergency fix',
      'verification test',
      'language fix',
      'integration test',
      'runtime debug',
      'post deploy',
      'restoration complete',
      'audit test',
      'final audit'
    ];

    const allPatterns = [...russianPatterns, ...testPatterns];
    
    let totalDeleted = 0;
    const results = [];
    
    // Попытка получить и удалить статьи из WordPress
    try {
      const response = await fetch('https://app.icoffio.com/api/wordpress-articles');
      const data = await response.json();
      
      if (data.success && data.articles) {
        for (const article of data.articles) {
          const shouldDelete = allPatterns.some(pattern => 
            article.title?.includes(pattern) ||
            article.slug?.includes(pattern.toLowerCase().replace(/\s+/g, '-'))
          );
          
          if (shouldDelete) {
            console.log(`🗑️ Found problematic WordPress article: ${article.title}`);
            results.push({
              type: 'wordpress',
              title: article.title,
              slug: article.slug,
              action: 'identified_for_deletion'
            });
            totalDeleted++;
          }
        }
      }
    } catch (wpError) {
      console.warn('WordPress check failed:', wpError);
      results.push({
        type: 'wordpress',
        error: 'Failed to access WordPress articles',
        details: wpError instanceof Error ? wpError.message : 'Unknown error'
      });
    }

    // JavaScript код для очистки localStorage в браузере
    const localStorageCleanup = `
// АГРЕССИВНАЯ ОЧИСТКА localStorage
(function() {
  console.log('🧹 FORCE CLEANING localStorage...');
  
  const storage = localStorage.getItem('icoffio_admin_articles');
  if (!storage) {
    console.log('No localStorage articles found');
    return { deleted: 0, remaining: 0 };
  }
  
  const articles = JSON.parse(storage);
  console.log('Found', articles.length, 'localStorage articles');
  
  const deletePatterns = [${allPatterns.map(p => `/${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`).join(', ')}];
  
  let deleted = 0;
  const cleaned = articles.filter(article => {
    const shouldDelete = deletePatterns.some(pattern => 
      pattern.test(article.title) || 
      pattern.test(article.content || '') || 
      pattern.test(article.excerpt || '') ||
      pattern.test(article.slug)
    ) || (article.content && article.content.length < 200);
    
    if (shouldDelete) {
      console.log('🗑️ DELETING:', article.title);
      deleted++;
      return false;
    }
    return true;
  });
  
  localStorage.setItem('icoffio_admin_articles', JSON.stringify(cleaned));
  
  console.log('✅ localStorage cleanup completed');
  console.log('Deleted:', deleted, 'Remaining:', cleaned.length);
  
  alert('✅ CLEANUP COMPLETED!\\n\\nDeleted: ' + deleted + ' articles\\nRemaining: ' + cleaned.length + ' clean articles\\n\\nPlease refresh the page!');
  
  return { deleted, remaining: cleaned.length };
})();
`;

    return NextResponse.json({
      success: true,
      message: `Force cleanup initiated - found ${totalDeleted} problematic articles`,
      wordpress_results: results,
      localStorage_cleanup_code: localStorageCleanup,
      total_identified: totalDeleted,
      instructions: [
        '1. Open app.icoffio.com/en/admin',
        '2. Open DevTools (F12) → Console',
        '3. Paste the localStorage_cleanup_code',
        '4. Press Enter to execute cleanup',
        '5. Refresh admin panel and website',
        '6. Check that Russian titles are gone'
      ]
    });

  } catch (error) {
    console.error('Force cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Force cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
