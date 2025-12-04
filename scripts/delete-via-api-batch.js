/**
 * 🗑️ УДАЛЕНИЕ СТАТЕЙ ЧЕРЕЗ API (BATCH)
 * 
 * Использует наш API endpoint /api/admin/delete-article
 * Работает если credentials настроены в Vercel
 */

const API_BASE_URL = 'https://app.icoffio.com';

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
 * Удаляет статью через наш API
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
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Главная функция удаления
 */
async function deleteArticlesBatch() {
  console.log('🗑️  УДАЛЕНИЕ ПРОБЛЕМНЫХ СТАТЕЙ ЧЕРЕЗ API\n');
  console.log(`Найдено slug для удаления: ${PROBLEMATIC_SLUGS.length}\n`);

  let deleted = 0;
  let failed = 0;
  let notFound = 0;
  const errors = [];

  for (const slug of PROBLEMATIC_SLUGS) {
    try {
      console.log(`🗑️  Удаляем: ${slug}...`);
      
      const result = await deleteArticleViaAPI(slug);
      
      if (result.success) {
        deleted++;
        console.log(`  ✅ Удалено (WP ID: ${result.wpPostId || 'N/A'})\n`);
      } else if (result.error && result.error.includes('not found')) {
        notFound++;
        console.log(`  ⚠️  Статья не найдена (возможно уже удалена)\n`);
      } else {
        failed++;
        errors.push({ slug, error: result.error || 'Unknown error' });
        console.log(`  ❌ Ошибка: ${result.error || 'Unknown error'}\n`);
      }

      // Задержка между удалениями
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error) {
      failed++;
      errors.push({ slug, error: error.message });
      console.log(`  ❌ Исключение: ${error.message}\n`);
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(50));
  console.log('📊 ОТЧЕТ О УДАЛЕНИИ:\n');
  console.log(`✅ Удалено: ${deleted} статей`);
  console.log(`⚠️  Не найдено: ${notFound} статей`);
  console.log(`❌ Ошибок: ${failed} статей`);
  console.log(`📊 Всего обработано: ${PROBLEMATIC_SLUGS.length} slug\n`);

  if (errors.length > 0) {
    console.log('❌ Детали ошибок:\n');
    errors.forEach(({ slug, error }) => {
      console.log(`  - ${slug}: ${error}`);
    });
    console.log('');
  }

  if (deleted > 0) {
    console.log('🎉 Удаление завершено!');
    console.log('⏱️  Изменения появятся на сайте в течение 1-2 минут.\n');
  } else if (failed === PROBLEMATIC_SLUGS.length) {
    console.log('⚠️  Не удалось удалить ни одной статьи.');
    console.log('Возможно, WordPress credentials не настроены в Vercel.\n');
  }
}

// Запуск
if (require.main === module) {
  deleteArticlesBatch()
    .then(() => {
      console.log('✅ Скрипт завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { deleteArticlesBatch };

