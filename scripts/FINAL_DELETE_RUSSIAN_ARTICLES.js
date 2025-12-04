/**
 * 🗑️ ФИНАЛЬНЫЙ СКРИПТ УДАЛЕНИЯ РУССКИХ СТАТЕЙ
 * 
 * Этот скрипт удалит все 29 проблемных статей после настройки credentials
 */

const WORDPRESS_API_URL = 'https://icoffio.com';

const PROBLEMATIC_SLUGS = [
  'apple-pl', 'apple-en', 'pl-2', 'en-5',
  'google-android-sms-ios-pl', 'google-android-sms-ios-en',
  'en-4', 'en-3', 'pl', 'en-2',
  'test-article-benefits-of-coffee-for-productivity-en',
  'siri-google-gemini-pl-4', 'siri-google-gemini-pl-3',
  'siri-google-gemini-en-4', 'siri-google-gemini-en-3',
  'siri-google-gemini-pl-2', 'siri-google-gemini-en-2',
  'siri-google-gemini-pl', 'siri-google-gemini-en',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-4',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-3',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-4',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-2',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-2',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl',
  'ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en',
  'ai-edited-test-en-2', 'en'
];

async function deleteArticles() {
  const username = process.env.WP_USERNAME || process.env.WORDPRESS_USERNAME;
  const password = process.env.WP_APP_PASSWORD || process.env.WORDPRESS_APP_PASSWORD;

  if (!username || !password) {
    console.error('❌ WordPress credentials не настроены!\n');
    console.error('ШАГ 1: Получите WordPress Application Password:');
    console.error('  1. Войдите: https://icoffio.com/wp-admin/');
    console.error('  2. Пользователи → Ваш профиль');
    console.error('  3. Application Passwords → Создать новый');
    console.error('  4. Скопируйте пароль\n');
    console.error('ШАГ 2: Установите credentials:');
    console.error('  export WP_USERNAME="your_username"');
    console.error('  export WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"\n');
    console.error('ШАГ 3: Запустите скрипт:');
    console.error('  node scripts/FINAL_DELETE_RUSSIAN_ARTICLES.js\n');
    process.exit(1);
  }

  console.log('🗑️  УДАЛЕНИЕ 29 ПРОБЛЕМНЫХ СТАТЕЙ\n');
  console.log(`Пользователь: ${username}`);
  console.log(`Slug для удаления: ${PROBLEMATIC_SLUGS.length}\n`);

  let deleted = 0;
  let failed = 0;
  let notFound = 0;

  for (const slug of PROBLEMATIC_SLUGS) {
    try {
      // Находим статью
      const findUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,title`;
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      
      const findResponse = await fetch(findUrl, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      if (!findResponse.ok) {
        console.log(`❌ ${slug}: Ошибка поиска (${findResponse.status})`);
        failed++;
        continue;
      }

      const posts = await findResponse.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        console.log(`⚠️  ${slug}: Не найдена`);
        notFound++;
        continue;
      }

      const postId = posts[0].id;
      const title = posts[0].title?.rendered || slug;

      // Удаляем статью
      const deleteUrl = `${WORDPRESS_API_URL}/wp-json/wp/v2/posts/${postId}?force=true`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (deleteResponse.ok) {
        console.log(`✅ ${slug}: Удалено (${title.substring(0, 50)}...)`);
        deleted++;
      } else {
        console.log(`❌ ${slug}: Ошибка удаления (${deleteResponse.status})`);
        failed++;
      }

      await new Promise(r => setTimeout(r, 600));

    } catch (error) {
      console.log(`❌ ${slug}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 РЕЗУЛЬТАТ: Удалено ${deleted}, Не найдено ${notFound}, Ошибок ${failed}`);
  if (deleted > 0) {
    console.log('🎉 Готово! Проверьте: https://app.icoffio.com\n');
  }
}

if (require.main === module) {
  deleteArticles().catch(console.error);
}

module.exports = { deleteArticles };

