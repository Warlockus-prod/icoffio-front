#!/usr/bin/env node

/**
 * Скрипт для перевода существующих статей на все языки
 * 
 * Использование:
 * node scripts/translate-existing-articles.js
 * node scripts/translate-existing-articles.js --language en
 * node scripts/translate-existing-articles.js --article "article-slug"
 */

const fs = require('fs');
const path = require('path');

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = ['en', 'pl', 'de', 'ro', 'cs'];

// Парсинг аргументов
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  return options;
}

// Симулируем ES модули
async function importModules() {
  try {
    const { translationService } = await import('../lib/translation-service.js');
    const { localArticles } = await import('../lib/local-articles.js');
    return { translationService, localArticles };
  } catch (error) {
    console.error('❌ Ошибка импорта:', error.message);
    console.log('ℹ️  Убедитесь, что проект собран: npm run build');
    process.exit(1);
  }
}

// Создание переведенной версии статьи
function createTranslatedArticle(originalArticle, translatedContent, language) {
  return {
    ...originalArticle,
    slug: `${originalArticle.slug}-${language}`,
    title: translatedContent.title,
    excerpt: translatedContent.excerpt,
    contentHtml: translatedContent.body,
    // Сохраняем оригинальные метаданные
    date: originalArticle.date,
    publishedAt: originalArticle.publishedAt,
    image: originalArticle.image,
    imageAlt: translatedContent.title,
    category: originalArticle.category,
    images: originalArticle.images
  };
}

// Сохранение переводов в файл
function saveTranslations(translations, outputPath) {
  const translationsData = {
    generated: new Date().toISOString(),
    totalArticles: translations.length,
    languages: SUPPORTED_LANGUAGES,
    translations: translations
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(translationsData, null, 2));
  console.log(`💾 Переводы сохранены в: ${outputPath}`);
}

// Отображение прогресса
function showProgress(current, total, message) {
  const progress = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
  process.stdout.write(`\r[${bar}] ${progress}% - ${message}`);
}

// Главная функция
async function main() {
  try {
    console.log('🌐 Переводчик статей icoffio\n');
    
    const options = parseArguments();
    const targetLanguage = options.language;
    const targetArticle = options.article;
    
    // Импорт модулей
    console.log('📦 Загружаем модули...');
    const { translationService, localArticles } = await importModules();
    
    if (!translationService.isAvailable()) {
      throw new Error('Сервис переводов недоступен. Проверьте OPENAI_API_KEY');
    }
    
    // Фильтрация статей
    let articlesToTranslate = localArticles;
    
    if (targetArticle) {
      articlesToTranslate = localArticles.filter(article => 
        article.slug === targetArticle
      );
      
      if (articlesToTranslate.length === 0) {
        throw new Error(`Статья с slug "${targetArticle}" не найдена`);
      }
    }
    
    // Фильтрация языков
    let languagesToTranslate = SUPPORTED_LANGUAGES;
    
    if (targetLanguage) {
      if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
        throw new Error(`Язык "${targetLanguage}" не поддерживается`);
      }
      languagesToTranslate = [targetLanguage];
    }
    
    console.log(`📊 Статистика перевода:`);
    console.log(`   • Статей: ${articlesToTranslate.length}`);
    console.log(`   • Языков: ${languagesToTranslate.length}`);
    console.log(`   • Всего переводов: ${articlesToTranslate.length * languagesToTranslate.length}\n`);
    
    const allTranslations = [];
    let completed = 0;
    const total = articlesToTranslate.length * languagesToTranslate.length;
    
    // Обработка каждой статьи
    for (const article of articlesToTranslate) {
      const articleTranslations = {
        originalSlug: article.slug,
        originalTitle: article.title,
        translations: {}
      };
      
      // Перевод на каждый язык
      for (const language of languagesToTranslate) {
        try {
          showProgress(completed, total, `${article.title.slice(0, 30)}... → ${language}`);
          
          // Извлекаем чистый текст из HTML
          const cleanContent = article.contentHtml
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000); // Ограничиваем размер для API
          
          const translatedContent = await translationService.translateContent(
            {
              title: article.title,
              excerpt: article.excerpt,
              body: cleanContent
            },
            language
          );
          
          // Создаем переведенную статью
          const translatedArticle = createTranslatedArticle(
            article, 
            translatedContent, 
            language
          );
          
          articleTranslations.translations[language] = translatedArticle;
          completed++;
          
          // Задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`\n❌ Ошибка перевода "${article.title}" на ${language}:`, error.message);
          completed++;
        }
      }
      
      allTranslations.push(articleTranslations);
    }
    
    console.log('\n\n✅ Перевод завершен!');
    
    // Сохранение результатов
    const outputPath = path.join(__dirname, '..', 'translated-articles.json');
    saveTranslations(allTranslations, outputPath);
    
    // Статистика
    const successfulTranslations = allTranslations.reduce((sum, article) => 
      sum + Object.keys(article.translations).length, 0
    );
    
    console.log(`\n📈 Итоговая статистика:`);
    console.log(`   • Успешных переводов: ${successfulTranslations}/${total}`);
    console.log(`   • Процент успеха: ${Math.round((successfulTranslations/total)*100)}%`);
    console.log(`   • Время выполнения: ~${Math.round(total * 1.5 / 60)} мин`);
    
  } catch (error) {
    console.error(`\n❌ Ошибка: ${error.message}`);
    process.exit(1);
  }
}

// Обработка прерывания
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Перевод прерван пользователем');
  process.exit(1);
});

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

