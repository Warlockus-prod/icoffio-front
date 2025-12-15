/**
 * ПУБЛИКАЦИЯ ХОРОШИХ СТАТЕЙ + УДАЛЕНИЕ ТЕСТОВЫХ
 * 
 * Этот скрипт:
 * 1. Публикует (draft → published) хорошие статьи
 * 2. Удаляет тестовые/сомнительные статьи из localStorage
 * 
 * npx ts-node scripts/publish-and-cleanup-articles.ts
 */

const API_BASE = 'https://app.icoffio.com';

// Хорошие статьи - ОПУБЛИКОВАТЬ
const PUBLISH_SLUGS = [
  'techcrunch-startup-and-technology-news-en',
  'techcrunch-startup-and-technology-news-pl',
  'how-to-run-any-pc-game-on-android-a-review-of-the-gamehub-em-en',
  'kak-zapustit-lyubuyu-igru-s-pk-na-android-obzor-emulyatora-g-pl', // wylsa.com
  'openai-news'
];

// Тестовые статьи - УДАЛИТЬ
const DELETE_SLUGS = [
  'revolutionary-breakthrough-in-quantum-computing-te-en',
  'revolutionary-breakthrough-in-quantum-computing-te-pl',
  'ai-revolution-2025-en',
  'ai-revolution-2025-pl',
  'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-en',
  'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-pl'
];

async function publishArticle(slug: string): Promise<boolean> {
  try {
    console.log(`\n📤 Публикую: ${slug}...`);
    
    // Используем admin API для публикации через localStorage
    // Эти статьи хранятся в localStorage, не в Supabase
    
    const response = await fetch(`${API_BASE}/api/admin/publish-article-from-storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Опубликовано: ${result.url || 'OK'}`);
      return true;
    } else {
      console.log(`   ⚠️  Не удалось опубликовать: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return false;
  }
}

async function deleteArticle(slug: string): Promise<boolean> {
  try {
    console.log(`\n🗑️  Удаляю: ${slug}...`);
    
    const response = await fetch(`${API_BASE}/api/admin/delete-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug })
    });
    
    if (response.ok) {
      console.log(`   ✅ Удалено`);
      return true;
    } else {
      console.log(`   ⚠️  Не удалось удалить: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔄 ПУБЛИКАЦИЯ ХОРОШИХ + УДАЛЕНИЕ ТЕСТОВЫХ СТАТЕЙ');
  console.log('═'.repeat(60));
  console.log(`\n✅ На публикацию: ${PUBLISH_SLUGS.length} статей`);
  console.log(`❌ На удаление: ${DELETE_SLUGS.length} статей\n`);
  
  // 1. Публикуем хорошие статьи
  console.log('\n' + '─'.repeat(60));
  console.log('📤 ШАГ 1: ПУБЛИКАЦИЯ ХОРОШИХ СТАТЕЙ');
  console.log('─'.repeat(60));
  
  let published = 0;
  for (const slug of PUBLISH_SLUGS) {
    const success = await publishArticle(slug);
    if (success) published++;
    await new Promise(r => setTimeout(r, 1000)); // Задержка 1 сек
  }
  
  // 2. Удаляем тестовые статьи
  console.log('\n' + '─'.repeat(60));
  console.log('🗑️  ШАГ 2: УДАЛЕНИЕ ТЕСТОВЫХ СТАТЕЙ');
  console.log('─'.repeat(60));
  
  let deleted = 0;
  for (const slug of DELETE_SLUGS) {
    const success = await deleteArticle(slug);
    if (success) deleted++;
    await new Promise(r => setTimeout(r, 1000)); // Задержка 1 сек
  }
  
  // Итоги
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('═'.repeat(60));
  console.log(`✅ Опубликовано: ${published}/${PUBLISH_SLUGS.length}`);
  console.log(`❌ Удалено: ${deleted}/${DELETE_SLUGS.length}`);
  console.log('═'.repeat(60));
  console.log('\n✅ ГОТОВО! Проверьте фронтенд через 2-3 минуты (кеш обновится)\n');
}

main();

