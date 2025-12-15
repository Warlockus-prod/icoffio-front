/**
 * 🧹 ОЧИСТКА ПРОБЛЕМНЫХ СТАТЕЙ ИЗ WORDPRESS ЧЕРЕЗ API
 * 
 * Использует наш API endpoint /api/admin/delete-article
 * который имеет доступ к WordPress credentials из Vercel
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.icoffio.com';

// Паттерны для определения проблемных статей
const RUSSIAN_PATTERNS = [
  /[а-яё]/i,  // Кириллица
  /русск/i,
  /статья/i,
  /прорыв/i,
  /революционн/i,
  /алгоритм/i,
  /обучени/i,
  /машин/i,
];

const TEST_PATTERNS = [
  /^test$/i,
  /^тест$/i,
  /test article/i,
  /тестовая/i,
  /test post/i,
  /^en$/i,
  /^ru$/i,
  /^pl$/i,
  /test-\d+/i,
  /wylsa-com/i,
  /techcrunch-com-ru/i,
  /ai-edited-test/i,
  /ai-2025-ru/i,
  /ai-ru/i,
];

const ERROR_PATTERNS = [
  /не удалось автоматически извлечь контент/i,
  /failed to automatically extract content/i,
  /http 403/i,
  /forbidden/i,
  /error extracting/i,
  /ошибка извлечения/i,
  /article from wylsa\.com/i,
  /статья с wylsa\.com/i,
];

/**
 * Проверяет, содержит ли текст русские символы
 */
function containsRussian(text) {
  if (!text) return false;
  return RUSSIAN_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Проверяет, является ли статья тестовой
 */
function isTestArticle(title, slug) {
  const combined = `${title} ${slug || ''}`.toLowerCase();
  return TEST_PATTERNS.some(pattern => pattern.test(combined));
}

/**
 * Проверяет, содержит ли статья ошибки извлечения
 */
function hasExtractionErrors(content) {
  if (!content) return false;
  const textContent = content.replace(/<[^>]*>/g, ' ');
  return ERROR_PATTERNS.some(pattern => pattern.test(textContent));
}

/**
 * Получает все статьи из WordPress через публичный API
 */
async function getAllWordPressArticles() {
  console.log('🔍 Получаем все статьи из WordPress...\n');
  
  const articles = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `https://icoffio.com/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&_fields=id,title,slug,content,excerpt,date,status`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
      }

      const pageArticles = await response.json();
      
      if (!Array.isArray(pageArticles) || pageArticles.length === 0) {
        hasMore = false;
      } else {
        articles.push(...pageArticles);
        console.log(`  📄 Загружено ${articles.length} статей...`);
        
        if (pageArticles.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка при загрузке страницы ${page}:`, error.message);
      hasMore = false;
    }
  }

  return articles;
}

/**
 * Находит проблемные статьи
 */
function findProblematicArticles(articles) {
  const problematic = [];

  for (const article of articles) {
    const reasons = [];
    const title = article.title?.rendered || article.title || '';
    const slug = article.slug || '';
    const content = article.content?.rendered || article.content || '';
    const excerpt = article.excerpt?.rendered || article.excerpt || '';

    // Проверка 1: Русский язык в заголовке
    if (containsRussian(title)) {
      reasons.push('🇷🇺 Русский заголовок');
    }

    // Проверка 2: Русский язык в контенте
    if (containsRussian(content) || containsRussian(excerpt)) {
      reasons.push('🇷🇺 Русский контент');
    }

    // Проверка 3: Русский язык в slug
    if (containsRussian(slug)) {
      reasons.push('🇷🇺 Русский slug');
    }

    // Проверка 4: Тестовая статья
    if (isTestArticle(title, slug)) {
      reasons.push('🧪 Тестовая статья');
    }

    // Проверка 5: Ошибки извлечения
    if (hasExtractionErrors(content) || hasExtractionErrors(excerpt)) {
      reasons.push('❌ Ошибка извлечения контента');
    }

    // Проверка 6: Подозрительный slug
    if (slug && slug.length <= 2) {
      reasons.push('🔗 Подозрительный slug (слишком короткий)');
    }

    // Если есть хотя бы одна причина - добавляем в список
    if (reasons.length > 0) {
      problematic.push({
        id: article.id,
        title: title.substring(0, 100),
        slug,
        reasons,
        status: article.status,
        date: article.date,
      });
    }
  }

  return problematic;
}

/**
 * Удаляет статью через наш API endpoint
 */
async function deleteArticleViaAPI(slug) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/delete-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug,
        locale: 'en',
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Главная функция очистки
 */
async function cleanWordPressArticlesViaAPI() {
  const isDryRun = process.argv.includes('--dry-run');
  const isConfirm = process.argv.includes('--confirm');

  console.log('🧹 ОЧИСТКА ПРОБЛЕМНЫХ СТАТЕЙ ИЗ WORDPRESS (через API)\n');
  console.log(`Режим: ${isDryRun ? '🔍 DRY-RUN (только просмотр)' : isConfirm ? '🗑️  РЕАЛЬНОЕ УДАЛЕНИЕ' : '🔍 ПРЕДПРОСМОТР (используйте --confirm для удаления)'}\n`);

  try {
    // Получаем все статьи
    const allArticles = await getAllWordPressArticles();
    
    if (allArticles.length === 0) {
      console.log('✅ Статей в WordPress не найдено');
      return;
    }

    console.log(`\n📊 Всего статей в WordPress: ${allArticles.length}\n`);

    // Находим проблемные
    const problematic = findProblematicArticles(allArticles);

    if (problematic.length === 0) {
      console.log('✅ Проблемных статей не найдено!');
      return;
    }

    // Группируем по причинам
    const byReason = {};
    problematic.forEach(article => {
      article.reasons.forEach(reason => {
        if (!byReason[reason]) byReason[reason] = [];
        if (!byReason[reason].find(a => a.id === article.id)) {
          byReason[reason].push(article);
        }
      });
    });

    // Выводим статистику
    console.log(`\n📊 СТАТИСТИКА ПРОБЛЕМНЫХ СТАТЕЙ:\n`);
    Object.entries(byReason).forEach(([reason, articles]) => {
      console.log(`  ${reason}: ${articles.length} статей`);
    });

    console.log(`\n🚨 НАЙДЕНО ПРОБЛЕМНЫХ СТАТЕЙ: ${problematic.length}\n`);

    // Выводим список
    problematic.forEach((article, index) => {
      const titlePreview = article.title.length > 60 ? article.title.substring(0, 60) + '...' : article.title;
      console.log(`${index + 1}. ID: ${article.id} | "${titlePreview}"`);
      console.log(`   Slug: ${article.slug}`);
      console.log(`   Статус: ${article.status}`);
      console.log(`   Причины: ${article.reasons.join(', ')}`);
      console.log(`   Дата: ${new Date(article.date).toLocaleDateString('ru-RU')}`);
      console.log('');
    });

    // Если dry-run или нет подтверждения - только показываем
    if (isDryRun || !isConfirm) {
      console.log('\n⚠️  Это был предпросмотр. Для реального удаления запустите:');
      console.log('   node scripts/clean-wordpress-via-api.js --confirm\n');
      return;
    }

    // Реальное удаление
    console.log('\n🗑️  НАЧИНАЕМ УДАЛЕНИЕ ЧЕРЕЗ API...\n');
    let deleted = 0;
    let failed = 0;

    for (const article of problematic) {
      const titlePreview = article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title;
      console.log(`🗑️  Удаляем: "${titlePreview}" (ID: ${article.id}, slug: ${article.slug})`);

      try {
        const success = await deleteArticleViaAPI(article.slug);
        if (success) {
          deleted++;
          console.log(`  ✅ Удалено через API`);
        } else {
          failed++;
          console.log(`  ❌ Не удалось удалить`);
        }
      } catch (error) {
        failed++;
        console.log(`  ❌ Ошибка: ${error.message}`);
      }

      // Задержка между удалениями
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('');
    }

    // Итоговый отчет
    console.log('\n📊 ОТЧЕТ О ОЧИСТКЕ:\n');
    console.log(`✅ Удалено: ${deleted} статей`);
    console.log(`❌ Ошибок: ${failed} статей`);
    console.log(`📊 Всего обработано: ${problematic.length} статей\n`);

    if (deleted > 0) {
      console.log('🎉 Очистка завершена! Проблемные статьи удалены из WordPress.');
      console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.\n');
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка очистки:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  cleanWordPressArticlesViaAPI()
    .then(() => {
      console.log('✅ Скрипт очистки завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { cleanWordPressArticlesViaAPI, findProblematicArticles };

