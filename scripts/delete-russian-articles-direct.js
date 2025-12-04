/**
 * 🗑️ ПРЯМОЕ УДАЛЕНИЕ РУССКИХ СТАТЕЙ ИЗ WORDPRESS
 * 
 * Использует прямой доступ к WordPress REST API
 * Требует WordPress credentials
 */

const WORDPRESS_API_URL = 'https://icoffio.com';

// Список slug статей для удаления (из предыдущего анализа)
const PROBLEMATIC_SLUGS = [
  'apple-pl',
  'apple-en',
  'pl-2',
  'en-5',
  'google-android-sms-ios-pl',
  'google-android-sms-ios-en',
  'en-4',
  'en-3',
  'pl',
  'en-2',
  'test-article-benefits-of-coffee-for-productivity-en',
  'siri-google-gemini-pl-4',
  'siri-google-gemini-pl-3',
  'siri-google-gemini-en-4',
  'siri-google-gemini-en-3',
  'siri-google-gemini-pl-2',
  'siri-google-gemini-en-2',
  'siri-google-gemini-pl',
  'siri-google-gemini-en',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-4',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-3',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-4',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-2',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-2',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en',
  'ai-edited-test-en-2',
  'en'
];

/**
 * Находит ID поста по slug
 */
async function findPostIdBySlug(slug, username, password) {
  try {
    const url = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,title`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const posts = await response.json();
    if (Array.isArray(posts) && posts.length > 0) {
      return { id: posts[0].id, title: posts[0].title?.rendered || posts[0].title || slug };
    }
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Удаляет пост по ID
 */
async function deletePostById(postId, username, password) {
  try {
    const url = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts/${postId}?force=true`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Главная функция удаления
 */
async function deleteRussianArticles() {
  const username = process.env.WP_USERNAME || process.env.WORDPRESS_USERNAME;
  const password = process.env.WP_APP_PASSWORD || process.env.WORDPRESS_APP_PASSWORD;

  if (!username || !password) {
    console.error('❌ WordPress credentials not configured!');
    console.error('\nУстановите переменные окружения:');
    console.error('export WP_USERNAME="your_username"');
    console.error('export WP_APP_PASSWORD="your_app_password"');
    console.error('\nИли:');
    console.error('export WORDPRESS_USERNAME="your_username"');
    console.error('export WORDPRESS_APP_PASSWORD="your_app_password"');
    process.exit(1);
  }

  console.log('🗑️  УДАЛЕНИЕ РУССКИХ И ПРОБЛЕМНЫХ СТАТЕЙ ИЗ WORDPRESS\n');
  console.log(`Найдено slug для удаления: ${PROBLEMATIC_SLUGS.length}\n`);

  let deleted = 0;
  let failed = 0;
  const errors = [];

  for (const slug of PROBLEMATIC_SLUGS) {
    try {
      console.log(`🔍 Ищем статью: ${slug}...`);
      
      const postInfo = await findPostIdBySlug(slug, username, password);
      
      if (!postInfo) {
        console.log(`  ⚠️  Статья не найдена (возможно уже удалена)\n`);
        continue;
      }

      console.log(`  📄 Найдена: "${postInfo.title}" (ID: ${postInfo.id})`);
      console.log(`  🗑️  Удаляем...`);

      const success = await deletePostById(postInfo.id, username, password);
      
      if (success) {
        deleted++;
        console.log(`  ✅ Удалено!\n`);
      } else {
        failed++;
        errors.push({ slug, error: 'Unknown error' });
        console.log(`  ❌ Не удалось удалить\n`);
      }

      // Задержка между удалениями
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      failed++;
      errors.push({ slug, error: error.message });
      console.log(`  ❌ Ошибка: ${error.message}\n`);
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(50));
  console.log('📊 ОТЧЕТ О УДАЛЕНИИ:\n');
  console.log(`✅ Удалено: ${deleted} статей`);
  console.log(`❌ Ошибок: ${failed} статей`);
  console.log(`📊 Всего обработано: ${PROBLEMATIC_SLUGS.length} slug\n`);

  if (errors.length > 0) {
    console.log('❌ Ошибки:\n');
    errors.forEach(({ slug, error }) => {
      console.log(`  - ${slug}: ${error}`);
    });
    console.log('');
  }

  if (deleted > 0) {
    console.log('🎉 Удаление завершено!');
    console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.\n');
  }
}

// Запуск
if (require.main === module) {
  deleteRussianArticles()
    .then(() => {
      console.log('✅ Скрипт завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { deleteRussianArticles };

