#!/usr/bin/env node

/**
 * 🌍 AUTO-TRANSLATE ALL ARTICLES
 * Переводит все статьи WordPress на 4 языка через OpenAI API
 */

const fs = require('fs');
const path = require('path');

// Конфигурация
const WORDPRESS_API = 'https://icoffio.com/graphql';
const NEXTJS_API = 'https://www.icoffio.com/api/translate';
const TARGET_LANGUAGES = ['pl', 'de', 'ro', 'cs']; // en уже есть
const DELAY_BETWEEN_REQUESTS = 2000; // 2 секунды между запросами
const MAX_RETRIES = 3;

// Функция для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Получить все статьи из WordPress
async function getAllArticles() {
  console.log('📊 Получаем список всех статей из WordPress...');
  
  const query = {
    query: `
      query {
        posts(first: 100) {
          nodes {
            title
            slug  
            excerpt
            content
            date
            categories {
              nodes {
                name
                slug
              }
            }
            featuredImage {
              node {
                sourceUrl
              }
            }
          }
        }
      }
    `
  };

  try {
    const response = await fetch(WORDPRESS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const articles = data.data.posts.nodes;
    console.log(`✅ Найдено ${articles.length} статей для перевода`);
    return articles;
    
  } catch (error) {
    console.error('❌ Ошибка получения статей:', error.message);
    return [];
  }
}

// Перевести одну статью на один язык
async function translateArticle(article, targetLang, retryCount = 0) {
  console.log(`🔄 Переводим "${article.title}" на ${targetLang.toUpperCase()}...`);
  
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
        },
        targetLanguage: targetLang
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API failed: ${response.status}`);
    }

    const translation = await response.json();
    
    if (translation.error) {
      throw new Error(translation.error);
    }

    console.log(`✅ Переведено на ${targetLang.toUpperCase()}: "${translation.result.title}"`);
    return {
      ...article,
      translated: {
        language: targetLang,
        title: translation.result.title,
        excerpt: translation.result.excerpt,
        content: translation.result.body
      }
    };
    
  } catch (error) {
    console.error(`❌ Ошибка перевода на ${targetLang}:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Повторная попытка ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(DELAY_BETWEEN_REQUESTS * 2); // Увеличиваем задержку
      return translateArticle(article, targetLang, retryCount + 1);
    }
    
    return null;
  }
}

// Основная функция
async function translateAllArticles() {
  console.log('🚀 ЗАПУСК АВТОМАТИЧЕСКОГО ПЕРЕВОДА ВСЕХ СТАТЕЙ');
  console.log(`🎯 Целевые языки: ${TARGET_LANGUAGES.join(', ').toUpperCase()}`);
  
  // Получаем все статьи
  const articles = await getAllArticles();
  
  if (articles.length === 0) {
    console.log('❌ Нет статей для перевода');
    return;
  }

  const totalTranslations = articles.length * TARGET_LANGUAGES.length;
  let completed = 0;
  const results = [];

  console.log(`📈 Начинаем перевод: ${articles.length} статей × ${TARGET_LANGUAGES.length} языков = ${totalTranslations} переводов`);
  console.log('⏰ Примерное время: ~' + Math.ceil(totalTranslations * 3 / 60) + ' минут');
  
  // Переводим каждую статью на все языки
  for (const article of articles) {
    console.log(`\n📰 Обрабатываем: "${article.title}"`);
    const articleTranslations = { original: article, translations: {} };
    
    for (const lang of TARGET_LANGUAGES) {
      const translation = await translateArticle(article, lang);
      
      if (translation) {
        articleTranslations.translations[lang] = translation.translated;
        completed++;
      }
      
      // Прогресс
      const progress = Math.round((completed / totalTranslations) * 100);
      console.log(`📊 Прогресс: ${completed}/${totalTranslations} (${progress}%)`);
      
      // Задержка между запросами
      if (completed < totalTranslations) {
        await delay(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    results.push(articleTranslations);
  }

  // Сохраняем результаты
  const outputFile = path.join(__dirname, '..', 'translations-output.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  
  console.log(`\n🎉 ПЕРЕВОД ЗАВЕРШЕН!`);
  console.log(`📊 Обработано: ${articles.length} статей`);
  console.log(`🌍 Переводов: ${completed}/${totalTranslations}`);
  console.log(`💾 Результаты сохранены: ${outputFile}`);
  
  return results;
}

// Запуск
if (require.main === module) {
  translateAllArticles().catch(console.error);
}

module.exports = { translateAllArticles };


















