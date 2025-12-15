#!/usr/bin/env node
/**
 * 🗑️ CLEANUP SCRIPT - УДАЛЕНИЕ ВСЕХ ТЕСТОВЫХ СТАТЕЙ
 * Очищает localStorage от тестовых статей с русскими заголовками
 */

const fs = require('fs');
const path = require('path');

console.log('🗑️ Starting test articles cleanup...');

// Patterns для поиска тестовых статей
const testPatterns = [
  /статья с сайта/i,
  /test\s+article/i,
  /тест/i,
  /demo/i,
  /emergency/i,
  /debug/i,
  /quick\s+test/i,
  /final\s+test/i,
  /runtime/i,
  /verification/i,
  /контент извлечен/i,
  /это автоматически созданная/i,
  /для тестирования/i
];

// Создаем скрипт для очистки
const cleanupScript = `
// Очистка тестовых статей из localStorage
(function() {
  try {
    const storage = localStorage.getItem('icoffio_admin_articles');
    if (!storage) {
      console.log('No admin articles found in localStorage');
      return;
    }
    
    const articles = JSON.parse(storage);
    console.log('Found', articles.length, 'articles in localStorage');
    
    const testPatterns = [
      /статья с сайта/i,
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
      /это автоматически созданная/i,
      /для тестирования/i,
      /techcrunch/i,
      /example\\.com/i
    ];
    
    let deletedCount = 0;
    const cleanedArticles = articles.filter(article => {
      const isTest = testPatterns.some(pattern => 
        pattern.test(article.title) || 
        pattern.test(article.content) || 
        pattern.test(article.excerpt)
      );
      
      if (isTest) {
        console.log('Deleting test article:', article.title);
        deletedCount++;
        return false;
      }
      return true;
    });
    
    localStorage.setItem('icoffio_admin_articles', JSON.stringify(cleanedArticles));
    console.log('✅ Cleanup completed:', deletedCount, 'test articles deleted');
    console.log('Remaining articles:', cleanedArticles.length);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
})();
`;

// Сохраняем скрипт
const scriptPath = path.join(__dirname, '../public/cleanup.js');
fs.writeFileSync(scriptPath, cleanupScript);

console.log('✅ Cleanup script created at:', scriptPath);
console.log('🌐 Run this in browser console on app.icoffio.com/en/admin:');
console.log('');
console.log('fetch("/cleanup.js").then(r => r.text()).then(eval);');
console.log('');
console.log('Or manually run the cleanup script in browser DevTools console.');
