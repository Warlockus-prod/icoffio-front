#!/usr/bin/env node

/**
 * 🗑️ ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ ТЕСТОВЫХ СТАТЕЙ
 * Удаляет все статьи с русскими заголовками и тестовый мусор
 */

console.log('🗑️ FORCE CLEANUP - Removing all test articles...');

// JavaScript код для выполнения в браузере
const cleanupCode = `
(function() {
  console.log('🧹 Starting force cleanup of test articles...');
  
  try {
    const storage = localStorage.getItem('icoffio_admin_articles');
    if (!storage) {
      console.log('📭 No admin articles found in localStorage');
      return { success: true, message: 'No articles to clean', deleted: 0, remaining: 0 };
    }
    
    const articles = JSON.parse(storage);
    console.log('📊 Found', articles.length, 'articles in localStorage');
    
    // Расширенные паттерны для поиска ВСЕХ тестовых статей
    const testPatterns = [
      // Русские заголовки
      /статья с сайта/i,
      /контент извлечен/i,
      /это автоматически созданная/i,
      /для тестирования/i,
      /исходный url/i,
      
      // Английские тестовые
      /article from/i,
      /content extracted/i,
      /this is an automatically created/i,
      /admin panel testing/i,
      /original url/i,
      
      // Тестовые ключевые слова
      /test.*article/i,
      /testing.*article/i,
      /debug.*test/i,
      /emergency.*fix/i,
      /quick.*test/i,
      /final.*test/i,
      /runtime.*debug/i,
      /verification.*test/i,
      /language.*fix/i,
      /integration.*test/i,
      /post.*deploy/i,
      /ultimate.*language/i,
      /restoration.*complete/i,
      
      // Домены и специфичные названия
      /techcrunch\\.com/i,
      /example\\.com/i,
      /wylsa\\.com/i,
      /android\\.com\\.pl/i,
      
      // Тестовые типы контента
      /demo/i,
      /тест/i,
      /проверка/i,
      /испытание/i
    ];
    
    const originalCount = articles.length;
    let deletedCount = 0;
    
    // Фильтруем статьи
    const cleanedArticles = articles.filter(article => {
      const isTest = testPatterns.some(pattern => 
        pattern.test(article.title) || 
        pattern.test(article.content) || 
        pattern.test(article.excerpt) ||
        pattern.test(article.slug)
      );
      
      if (isTest) {
        console.log('🗑️ DELETING:', article.title);
        deletedCount++;
        return false; // Remove this article
      }
      
      console.log('✅ KEEPING:', article.title);
      return true; // Keep this article
    });
    
    // Сохраняем очищенный список
    localStorage.setItem('icoffio_admin_articles', JSON.stringify(cleanedArticles));
    
    console.log('✅ CLEANUP COMPLETED!');
    console.log('📊 Results:');
    console.log('   - Original articles:', originalCount);
    console.log('   - Deleted articles:', deletedCount);
    console.log('   - Remaining articles:', cleanedArticles.length);
    
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
    return { success: false, error: error.message };
  }
})();
`;

console.log('📋 INSTRUCTIONS FOR MANUAL CLEANUP:');
console.log('');
console.log('1. Open https://app.icoffio.com/en/admin in browser');
console.log('2. Login with password: icoffio2025');
console.log('3. Open DevTools (F12) → Console tab');
console.log('4. Paste this code and press Enter:');
console.log('');
console.log('Copy this entire block:');
console.log('========================================');
console.log(cleanupCode);
console.log('========================================');
console.log('');

// Также создаем API запрос
console.log('🌐 OR use this curl command:');
console.log('');
console.log('curl -X POST "https://app.icoffio.com/api/admin/cleanup" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"action": "clean_test_articles", "password": "icoffio2025"}\'');
console.log('');
console.log('Then execute the returned cleanup_code in browser console.');
