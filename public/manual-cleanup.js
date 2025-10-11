// 🗑️ ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ ТЕСТОВЫХ СТАТЕЙ
(function() {
  console.log('🧹 Starting FORCE cleanup of ALL test articles...');
  
  try {
    const storage = localStorage.getItem('icoffio_admin_articles');
    if (!storage) {
      console.log('📭 No admin articles found in localStorage');
      return { success: true, message: 'No articles to clean', deleted: 0, remaining: 0 };
    }
    
    const articles = JSON.parse(storage);
    console.log('📊 Found', articles.length, 'articles in localStorage');
    
    // МАКСИМАЛЬНО АГРЕССИВНЫЕ паттерны для удаления ВСЕГО мусора
    const testPatterns = [
      // Русские заголовки (ГЛАВНАЯ ПРОБЛЕМА)
      /статья с сайта/i,
      /контент извлечен/i,
      /это автоматически созданная/i,
      /для тестирования/i,
      /исходный url/i,
      
      // Английские тестовые заголовки
      /article from/i,
      /content extracted/i,
      /this is an automatically created/i,
      /admin panel testing/i,
      /original url/i,
      
      // Все тестовые ключевые слова
      /test/i,
      /тест/i,
      /demo/i,
      /debug/i,
      /emergency/i,
      /quick/i,
      /final/i,
      /runtime/i,
      /verification/i,
      /language.*fix/i,
      /integration/i,
      /post.*deploy/i,
      /ultimate/i,
      /restoration/i,
      /audit/i,
      
      // Проблемные домены
      /techcrunch/i,
      /example\.com/i,
      /wylsa\.com/i,
      /android\.com/i,
      
      // Временные или тестовые фразы
      /проверка/i,
      /испытание/i,
      /временный/i,
      /временно/i,
      /testing/i
    ];
    
    const originalCount = articles.length;
    let deletedCount = 0;
    
    console.log('🔍 Checking each article...');
    
    // Фильтруем статьи максимально агрессивно
    const cleanedArticles = articles.filter(article => {
      const isTest = testPatterns.some(pattern => 
        pattern.test(article.title) || 
        pattern.test(article.content || '') || 
        pattern.test(article.excerpt || '') ||
        pattern.test(article.slug)
      );
      
      if (isTest) {
        console.log('🗑️ DELETING TEST ARTICLE:', article.title);
        deletedCount++;
        return false; // Remove this article
      }
      
      // Дополнительная проверка на короткий низкокачественный контент
      if (article.content && article.content.length < 200) {
        console.log('🗑️ DELETING SHORT ARTICLE:', article.title);
        deletedCount++;
        return false;
      }
      
      console.log('✅ KEEPING CLEAN ARTICLE:', article.title);
      return true; // Keep this article
    });
    
    // Сохраняем ТОЛЬКО чистые статьи
    localStorage.setItem('icoffio_admin_articles', JSON.stringify(cleanedArticles));
    
    console.log('✅ FORCE CLEANUP COMPLETED!');
    console.log('📊 Final Results:');
    console.log('   - Original articles:', originalCount);
    console.log('   - Deleted test articles:', deletedCount);
    console.log('   - Remaining clean articles:', cleanedArticles.length);
    
    if (cleanedArticles.length > 0) {
      console.log('🎯 Remaining articles:');
      cleanedArticles.forEach(article => {
        console.log('   ✅', article.title, `(${article.slug})`);
      });
    }
    
    // Показываем результат пользователю
    alert(`🧹 FORCE CLEANUP COMPLETED!

📊 Results:
• Original articles: ${originalCount}
• Deleted test articles: ${deletedCount} 
• Remaining clean articles: ${cleanedArticles.length}

The site should now show only clean, professional content!

Please refresh the page to see the updated content.`);
    
    return { 
      success: true, 
      message: 'Force cleanup completed successfully',
      original: originalCount,
      deleted: deletedCount,
      remaining: cleanedArticles.length,
      cleanedArticles: cleanedArticles.map(a => ({ title: a.title, slug: a.slug }))
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    alert('❌ Cleanup failed: ' + error.message);
    return { success: false, error: error.message };
  }
})();
