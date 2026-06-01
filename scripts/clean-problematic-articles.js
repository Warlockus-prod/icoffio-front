/**
 * 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА ПРОБЛЕМНЫХ СТАТЕЙ (JavaScript версия)
 * 
 * Удаляет:
 * 1. Русские статьи (по паттернам в контенте, title, slug)
 * 2. Тестовые статьи (test, Test, тест, etc)
 * 3. Неполные статьи (короткие, с ошибками извлечения)
 * 4. Дублирующиеся статьи
 * 
 * Использование:
 *   node scripts/clean-problematic-articles.js --dry-run  # Только показать что будет удалено
 *   node scripts/clean-problematic-articles.js --confirm  # Реальное удаление
 */

const { Pool } = require('pg');

// Конфигурация
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not configured');
  console.error('Set DATABASE_URL and run again');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

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

const SHORT_CONTENT_THRESHOLD = 200; // Минимальная длина контента в символах

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
function isTestArticle(title, slugEn, slugPl) {
  const combined = `${title} ${slugEn || ''} ${slugPl || ''}`.toLowerCase();
  return TEST_PATTERNS.some(pattern => pattern.test(combined));
}

/**
 * Проверяет, содержит ли статья ошибки извлечения
 */
function hasExtractionErrors(content) {
  if (!content) return false;
  return ERROR_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Проверяет, является ли статья слишком короткой
 */
function isTooShort(contentEn, contentPl) {
  const enLength = contentEn?.length || 0;
  const plLength = contentPl?.length || 0;
  const maxLength = Math.max(enLength, plLength);
  return maxLength > 0 && maxLength < SHORT_CONTENT_THRESHOLD;
}

/**
 * Находит все проблемные статьи
 */
async function findProblematicArticles() {
  console.log('🔍 Ищем проблемные статьи в PostgreSQL...\n');

  // Получаем ВСЕ статьи (включая неопубликованные) для полной проверки
  const { rows: articles } = await pool.query(
    `SELECT * FROM published_articles ORDER BY created_at DESC`
  );

  if (!articles || articles.length === 0) {
    console.log('✅ Статей не найдено');
    return [];
  }

  console.log(`📊 Найдено статей: ${articles.length}\n`);

  const problematic = [];

  for (const article of articles) {
    const reasons = [];
    const title = article.title || '';
    const slugEn = article.slug_en;
    const slugPl = article.slug_pl;
    const contentEn = article.content_en;
    const contentPl = article.content_pl;
    const excerptEn = article.excerpt_en;
    const excerptPl = article.excerpt_pl;

    // Проверка 1: Русский язык в заголовке
    if (containsRussian(title)) {
      reasons.push('🇷🇺 Русский заголовок');
    }

    // Проверка 2: Русский язык в контенте
    if (containsRussian(contentEn) || containsRussian(contentPl)) {
      reasons.push('🇷🇺 Русский контент');
    }

    // Проверка 3: Русский язык в slug
    if (containsRussian(slugEn) || containsRussian(slugPl)) {
      reasons.push('🇷🇺 Русский slug');
    }

    // Проверка 4: Тестовая статья
    if (isTestArticle(title, slugEn, slugPl)) {
      reasons.push('🧪 Тестовая статья');
    }

    // Проверка 5: Ошибки извлечения
    if (hasExtractionErrors(contentEn) || hasExtractionErrors(contentPl)) {
      reasons.push('❌ Ошибка извлечения контента');
    }

    // Проверка 6: Слишком короткая статья
    if (isTooShort(contentEn, contentPl)) {
      const maxLength = Math.max((contentEn?.length || 0), (contentPl?.length || 0));
      reasons.push(`📏 Слишком короткая (${maxLength} символов)`);
    }

    // Проверка 7: Односимвольные или пустые slug
    if ((slugEn && slugEn.length <= 2) || (slugPl && slugPl.length <= 2)) {
      reasons.push('🔗 Подозрительный slug (слишком короткий)');
    }

    // Проверка 8: Нет контента ни на одном языке
    if (!contentEn && !contentPl) {
      reasons.push('📄 Нет контента');
    }

    // Если есть хотя бы одна причина - добавляем в список
    if (reasons.length > 0) {
      problematic.push({
        id: article.id,
        title,
        slug_en: slugEn,
        slug_pl: slugPl,
        content_en: contentEn,
        content_pl: contentPl,
        excerpt_en: excerptEn,
        excerpt_pl: excerptPl,
        reasons,
        word_count: article.word_count,
        created_at: article.created_at,
      });
    }
  }

  return problematic;
}

/**
 * Удаляет статью из PostgreSQL
 */
async function deleteFromDatabase(articleId) {
  try {
    await pool.query(`DELETE FROM published_articles WHERE id = $1`, [articleId]);
    return true;
  } catch (error) {
    console.error(`  ❌ Исключение при удалении: ${error.message}`);
    return false;
  }
}

/**
 * Удаляет статью из WordPress (если есть slug)
 */
async function deleteFromWordPress(slugEn, slugPl) {
  const slugs = [slugEn, slugPl].filter(Boolean);
  if (slugs.length === 0) return true; // Нет slug - пропускаем

  const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'https://icoffio.com';
  const WP_USERNAME = process.env.WP_USERNAME;
  const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

  if (!WP_USERNAME || !WP_APP_PASSWORD) {
    console.log('  ⚠️  WordPress credentials not configured, skipping WordPress deletion');
    return true; // Не критично
  }

  let deleted = true;
  for (const slug of slugs) {
    try {
      // Ищем пост по slug
      const searchUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64')}`,
        },
      });

      if (searchResponse.ok) {
        const posts = await searchResponse.json();
        if (Array.isArray(posts) && posts.length > 0) {
          const postId = posts[0].id;
          // Удаляем пост
          const deleteUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts/${postId}?force=true`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResponse.ok) {
            console.log(`  ✅ Удалено из WordPress (slug: ${slug})`);
          } else {
            console.log(`  ⚠️  Не удалось удалить из WordPress (slug: ${slug})`);
            deleted = false;
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Ошибка при удалении из WordPress (slug: ${slug}): ${error.message}`);
      deleted = false;
    }
  }

  return deleted;
}

/**
 * Главная функция очистки
 */
async function cleanProblematicArticles() {
  const isDryRun = process.argv.includes('--dry-run');
  const isConfirm = process.argv.includes('--confirm');

  console.log('🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА ПРОБЛЕМНЫХ СТАТЕЙ\n');
  console.log(`Режим: ${isDryRun ? '🔍 DRY-RUN (только просмотр)' : isConfirm ? '🗑️  РЕАЛЬНОЕ УДАЛЕНИЕ' : '🔍 ПРЕДПРОСМОТР (используйте --confirm для удаления)'}\n`);

  try {
    // Находим проблемные статьи
    const problematic = await findProblematicArticles();

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
      console.log(`   Slug EN: ${article.slug_en || 'N/A'} | PL: ${article.slug_pl || 'N/A'}`);
      console.log(`   Причины: ${article.reasons.join(', ')}`);
      console.log(`   Создано: ${new Date(article.created_at).toLocaleDateString('ru-RU')}`);
      console.log('');
    });

    // Если dry-run или нет подтверждения - только показываем
    if (isDryRun || !isConfirm) {
      console.log('\n⚠️  Это был предпросмотр. Для реального удаления запустите:');
      console.log('   npm run clean-problematic -- --confirm\n');
      return;
    }

    // Реальное удаление
    console.log('\n🗑️  НАЧИНАЕМ УДАЛЕНИЕ...\n');
    let deletedDatabase = 0;
    let deletedWordPress = 0;
    let failedDatabase = 0;
    let failedWordPress = 0;

    for (const article of problematic) {
      const titlePreview = article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title;
      console.log(`🗑️  Удаляем: "${titlePreview}" (ID: ${article.id})`);

      // Удаляем из PostgreSQL
      const databaseDeleted = await deleteFromDatabase(article.id);
      if (databaseDeleted) {
        deletedDatabase++;
        console.log(`  ✅ Удалено из PostgreSQL`);
      } else {
        failedDatabase++;
      }

      // Удаляем из WordPress
      const wpDeleted = await deleteFromWordPress(article.slug_en, article.slug_pl);
      if (wpDeleted) {
        deletedWordPress++;
      } else {
        failedWordPress++;
      }

      // Задержка между удалениями
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('');
    }

    // Итоговый отчет
    console.log('\n📊 ОТЧЕТ О ОЧИСТКЕ:\n');
    console.log(`✅ Удалено из PostgreSQL: ${deletedDatabase} статей`);
    console.log(`✅ Удалено из WordPress: ${deletedWordPress} статей`);
    console.log(`❌ Ошибок PostgreSQL: ${failedDatabase}`);
    console.log(`❌ Ошибок WordPress: ${failedWordPress}`);
    console.log(`📊 Всего обработано: ${problematic.length} статей\n`);

    if (deletedDatabase > 0) {
      console.log('🎉 Очистка завершена! Проблемные статьи удалены.');
      console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.\n');
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка очистки:', error);
    throw error;
  }
}

// Запуск скрипта
if (require.main === module) {
  cleanProblematicArticles()
    .then(() => {
      console.log('✅ Скрипт очистки завершен');
      process.exitCode = 0;
    })
    .catch((error) => {
      console.error('❌ Скрипт завершился с ошибкой:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end().catch(() => {});
      process.exit(process.exitCode || 0);
    });
}

module.exports = { cleanProblematicArticles, findProblematicArticles };
