/**
 * 🗑️ УДАЛЕНИЕ СТАТЕЙ НА ПРОДАКШЕНЕ
 * 
 * Удаляет статьи напрямую через WordPress REST API
 * Работает с credentials из переменных окружения или Vercel
 */

const WORDPRESS_API_URL = 'https://icoffio.com';

// Список slug статей для удаления
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
 * Получает credentials из разных источников
 */
function getCredentials() {
  // Пробуем разные варианты переменных окружения
  const username = process.env.WP_USERNAME || 
                   process.env.WORDPRESS_USERNAME ||
                   process.env.WP_USER ||
                   null;
  
  const password = process.env.WP_APP_PASSWORD || 
                   process.env.WORDPRESS_APP_PASSWORD ||
                   process.env.WP_PASSWORD ||
                   null;

  return { username, password };
}

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
      if (response.status === 401) {
        throw new Error('Unauthorized - проверьте credentials');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const posts = await response.json();
    if (Array.isArray(posts) && posts.length > 0) {
      return { 
        id: posts[0].id, 
        title: posts[0].title?.rendered || posts[0].title || slug 
      };
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
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Главная функция удаления
 */
async function deleteProductionArticles() {
  console.log('🗑️  УДАЛЕНИЕ ПРОБЛЕМНЫХ СТАТЕЙ НА ПРОДАКШЕНЕ\n');
  
  const { username, password } = getCredentials();

  if (!username || !password) {
    console.error('❌ WordPress credentials не найдены!\n');
    console.error('Установите переменные окружения:');
    console.error('export WP_USERNAME="your_username"');
    console.error('export WP_APP_PASSWORD="your_app_password"');
    console.error('\nИли добавьте в Vercel Environment Variables:\n');
    console.error('WP_USERNAME=your_username');
    console.error('WP_APP_PASSWORD=your_app_password\n');
    process.exit(1);
  }

  console.log(`✅ Credentials найдены для пользователя: ${username}`);
  console.log(`📋 Найдено slug для удаления: ${PROBLEMATIC_SLUGS.length}\n`);

  let deleted = 0;
  let failed = 0;
  let notFound = 0;
  const errors = [];

  for (const slug of PROBLEMATIC_SLUGS) {
    try {
      console.log(`🔍 Ищем статью: ${slug}...`);
      
      const postInfo = await findPostIdBySlug(slug, username, password);
      
      if (!postInfo) {
        notFound++;
        console.log(`  ⚠️  Статья не найдена (возможно уже удалена)\n`);
        continue;
      }

      console.log(`  📄 Найдена: "${postInfo.title.substring(0, 60)}${postInfo.title.length > 60 ? '...' : ''}" (ID: ${postInfo.id})`);
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
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (error) {
      failed++;
      errors.push({ slug, error: error.message });
      console.log(`  ❌ Ошибка: ${error.message}\n`);
      
      // Если это ошибка авторизации, прекращаем
      if (error.message.includes('Unauthorized')) {
        console.error('\n❌ Ошибка авторизации! Проверьте credentials.\n');
        break;
      }
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 ОТЧЕТ О УДАЛЕНИИ:\n');
  console.log(`✅ Удалено: ${deleted} статей`);
  console.log(`⚠️  Не найдено: ${notFound} статей`);
  console.log(`❌ Ошибок: ${failed} статей`);
  console.log(`📊 Всего обработано: ${PROBLEMATIC_SLUGS.length} slug\n`);

  if (errors.length > 0 && errors.length < PROBLEMATIC_SLUGS.length) {
    console.log('❌ Ошибки:\n');
    errors.slice(0, 5).forEach(({ slug, error }) => {
      console.log(`  - ${slug}: ${error}`);
    });
    if (errors.length > 5) {
      console.log(`  ... и еще ${errors.length - 5} ошибок`);
    }
    console.log('');
  }

  if (deleted > 0) {
    console.log('🎉 Удаление завершено!');
    console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.');
    console.log('🌐 Проверьте: https://app.icoffio.com\n');
  } else if (failed === PROBLEMATIC_SLUGS.length) {
    console.log('⚠️  Не удалось удалить ни одной статьи.');
    console.log('Проверьте WordPress credentials.\n');
  }
}

// Запуск
if (require.main === module) {
  deleteProductionArticles()
    .then(() => {
      console.log('✅ Скрипт завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { deleteProductionArticles };

