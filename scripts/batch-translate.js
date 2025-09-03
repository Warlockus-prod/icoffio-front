#!/usr/bin/env node

/**
 * 🚀 BATCH TRANSLATE ALL ARTICLES
 * Переводит все 40 статей WordPress одновременно на все языки
 */

const fs = require('fs');
const path = require('path');

const WORDPRESS_API = 'https://icoffio.com/graphql';
const NEXTJS_API = 'https://www.icoffio.com/api/translate';

async function batchTranslateAll() {
  console.log('🚀 МАССОВЫЙ ПЕРЕВОД ВСЕХ СТАТЕЙ ICOFFIO');
  
  // 1. Получаем все статьи
  console.log('📊 Получаем статьи из WordPress...');
  const query = {
    query: `query { 
      posts(first: 100) { 
        nodes { 
          title slug excerpt content 
          categories { nodes { name } }
          featuredImage { node { sourceUrl } }
        } 
      } 
    }`
  };

  const wpResponse = await fetch(WORDPRESS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  const wpData = await wpResponse.json();
  const articles = wpData.data.posts.nodes;
  
  console.log(`✅ Найдено ${articles.length} статей`);

  // 2. Переводим все статьи
  console.log('🌍 Запускаем автоперевод...');
  const allTranslations = [];
  let completed = 0;

  for (const article of articles.slice(0, 5)) { // Первые 5 для теста
    console.log(`\n📰 ${++completed}/${Math.min(5, articles.length)}: "${article.title}"`);
    
    try {
      const response = await fetch(NEXTJS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate-article',
          content: {
            title: article.title,
            excerpt: article.excerpt || '',
            body: article.content || ''
          }
        })
      });

      const translation = await response.json();
      
      if (translation.success) {
        console.log(`✅ Переведено на ${Object.keys(translation.translations).length} языков`);
        allTranslations.push({
          ...article,
          translations: translation.translations
        });
      } else {
        console.log(`❌ Ошибка: ${translation.error || 'Unknown error'}`);
      }
      
      // Пауза между запросами
      if (completed < Math.min(5, articles.length)) {
        console.log('⏸️  Пауза 3 сек...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Ошибка перевода:`, error.message);
    }
  }

  // 3. Сохраняем результаты
  const outputPath = path.join(__dirname, '..', 'translations-batch.json');
  fs.writeFileSync(outputPath, JSON.stringify(allTranslations, null, 2));
  
  console.log(`\n🎉 ГОТОВО!`);
  console.log(`📊 Переведено: ${allTranslations.length} статей`);
  console.log(`💾 Сохранено: ${outputPath}`);
  
  return allTranslations;
}

// Запуск
batchTranslateAll().catch(console.error);



