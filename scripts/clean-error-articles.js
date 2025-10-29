/**
 * 🧹 СКРИПТ ОЧИСТКИ ОШИБОЧНЫХ СТАТЕЙ
 * Удаляет все статьи с ошибками извлечения контента из WordPress
 */

const { wordpressService } = require('../lib/wordpress-service');

async function cleanErrorArticles() {
  console.log('🧹 Начинаем очистку ошибочных статей...');
  
  try {
    // 1. Получаем все статьи из WordPress
    console.log('📋 Получаем список всех статей...');
    const response = await fetch('https://app.icoffio.com/api/wordpress-articles');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Не удалось получить статьи: ${data.error}`);
    }
    
    console.log(`📊 Найдено ${data.articles.length} статей`);
    
    // 2. Фильтруем ошибочные статьи
    const errorArticles = data.articles.filter(article => {
      const hasExtractError = article.content && (
        article.content.includes('Не удалось автоматически извлечь контент') ||
        article.content.includes('Failed to automatically extract content') ||
        article.content.includes('HTTP 403') ||
        article.content.includes('Forbidden') ||
        article.content.includes('wylsa.com')
      );
      
      const hasErrorTitle = article.title && (
        article.title.includes('Article from wylsa.com') ||
        article.title.includes('Статья с wylsa.com')
      );
      
      return hasExtractError || hasErrorTitle;
    });
    
    console.log(`🚨 Найдено ${errorArticles.length} ошибочных статей для удаления:`);
    
    errorArticles.forEach((article, index) => {
      console.log(`${index + 1}. ID: ${article.id} | ${article.title} | ${new Date(article.publishedAt).toLocaleDateString()}`);
    });
    
    if (errorArticles.length === 0) {
      console.log('✅ Ошибочных статей не найдено!');
      return;
    }
    
    // 3. Подтверждение удаления
    console.log('\n⚠️  ВНИМАНИЕ: Вы действительно хотите удалить все эти статьи?');
    console.log('Для подтверждения запустите скрипт с флагом --confirm');
    
    if (!process.argv.includes('--confirm')) {
      console.log('❌ Удаление отменено. Для выполнения используйте: npm run clean-errors -- --confirm');
      return;
    }
    
    // 4. Удаление статей через WordPress API
    console.log('\n🗑️  Начинаем удаление...');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const article of errorArticles) {
      try {
        console.log(`🗑️  Удаляем: ${article.title}...`);
        
        // Удаляем статью через WordPress REST API
        const deleteResponse = await fetch(`https://icoffio.com/wp-json/wp/v2/posts/${article.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.WORDPRESS_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Удалена: ${article.title}`);
          deletedCount++;
        } else {
          console.log(`❌ Не удалось удалить: ${article.title} (${deleteResponse.status})`);
          failedCount++;
        }
        
        // Задержка между удалениями
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Ошибка удаления ${article.title}:`, error.message);
        failedCount++;
      }
    }
    
    // 5. Отчет о результатах
    console.log('\n📊 ОТЧЕТ О ОЧИСТКЕ:');
    console.log(`✅ Удалено: ${deletedCount} статей`);
    console.log(`❌ Ошибок: ${failedCount} статей`);
    console.log(`📊 Всего обработано: ${deletedCount + failedCount} из ${errorArticles.length}`);
    
    if (deletedCount > 0) {
      console.log('\n🎉 Очистка завершена! Ошибочные статьи удалены из WordPress.');
      console.log('⏱️  Изменения появятся на сайте в течение 2-3 минут.');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка очистки:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  cleanErrorArticles()
    .then(() => {
      console.log('\n✅ Скрипт очистки завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { cleanErrorArticles };






