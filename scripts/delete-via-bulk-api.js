/**
 * 🗑️ УДАЛЕНИЕ СТАТЕЙ ЧЕРЕЗ BULK API ENDPOINT
 * 
 * Использует /api/admin/bulk-delete-articles
 * Credentials берутся из Vercel environment variables
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.icoffio.com';

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
 * Главная функция удаления
 */
async function deleteArticlesViaBulkAPI() {
  console.log('🗑️  МАССОВОЕ УДАЛЕНИЕ СТАТЕЙ ЧЕРЕЗ API\n');
  console.log(`📋 Найдено slug для удаления: ${PROBLEMATIC_SLUGS.length}\n`);

  try {
    console.log('📤 Отправляем запрос на удаление...\n');
    
    const response = await fetch(`${API_BASE_URL}/api/admin/bulk-delete-wordpress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slugs: PROBLEMATIC_SLUGS,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    // Выводим результаты
    console.log('📊 РЕЗУЛЬТАТЫ УДАЛЕНИЯ:\n');
    console.log(`✅ Удалено: ${data.deleted} статей`);
    console.log(`⚠️  Не найдено: ${data.notFound} статей`);
    console.log(`❌ Ошибок: ${data.failed} статей`);
    console.log(`📊 Всего обработано: ${PROBLEMATIC_SLUGS.length} slug\n`);

    if (data.results && data.results.length > 0) {
      console.log('📋 Детали:\n');
      data.results.forEach((result, index) => {
        if (result.success) {
          console.log(`${index + 1}. ✅ ${result.slug} (WP ID: ${result.wpPostId})`);
        } else {
          console.log(`${index + 1}. ❌ ${result.slug}: ${result.error}`);
        }
      });
      console.log('');
    }

    if (data.deleted > 0) {
      console.log('🎉 Удаление завершено!');
      console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.');
      console.log('🌐 Проверьте: https://app.icoffio.com\n');
    } else {
      console.log('⚠️  Не удалось удалить ни одной статьи.');
      if (data.failed === PROBLEMATIC_SLUGS.length) {
        console.log('Возможно, WordPress credentials не настроены в Vercel.\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error('\nВозможные причины:');
    console.error('1. WordPress credentials не настроены в Vercel');
    console.error('2. API endpoint не доступен');
    console.error('3. Проблемы с сетью\n');
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  deleteArticlesViaBulkAPI()
    .then(() => {
      console.log('✅ Скрипт завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { deleteArticlesViaBulkAPI };

