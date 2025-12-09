/**
 * ПРОСТАЯ ОЧИСТКА WORDPRESS
 * Удаляет статьи напрямую через WordPress REST API
 */

const WP_URL = 'https://icoffio.com';
const WP_USERNAME = process.env.WORDPRESS_USERNAME || 'icoffio_admin';
const WP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

// Список slug из Supabase (23 статьи которые НУЖНО ОСТАВИТЬ)
const KEEP_SLUGS = new Set([
  // Wylsa/TechCrunch статьи (созданные сегодня через admin panel)
  'how-to-run-any-pc-game-on-android-a-review-of-the-gamehub-em-en',
  'kak-zapustit-lyubuyu-igru-s-pk-na-android-obzor-emulyatora-g-pl',
  'techcrunch-startup-and-technology-news-en',
  'techcrunch-startup-and-technology-news-pl',
  
  // OpenAI
  'openai-news',
  
  // Test articles
  'revolutionary-breakthrough-in-quantum-computing-te-en',
  'revolutionary-breakthrough-in-quantum-computing-te-pl',
  'ai-revolution-2025-en',
  'ai-revolution-2025-pl',
  'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-en',
  'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimat-pl',
  
  // Static articles (published)
  'ai-revolution-2024-en',
  'ai-revolution-2024-pl',
  'apple-vision-pro-review-en',
  'apple-vision-pro-review-pl',
  'gaming-trends-2024-en',
  'gaming-trends-2024-pl',
  'tech-innovations-2024-en',
  'tech-innovations-2024-pl',
  'digital-transformation-guide-en',
  'digital-transformation-guide-pl',
  'tech-news-weekly-january-en',
  'tech-news-weekly-january-pl'
]);

async function getWordPressArticles() {
  console.log('📰 Получаю статьи из WordPress REST API...');
  
  try {
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts?per_page=100&_fields=id,slug,title`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const articles = await response.json();
    console.log(`✅ Найдено ${articles.length} статей в WordPress`);
    
    return articles;
  } catch (error) {
    console.error('❌ Ошибка получения статей:', error.message);
    throw error;
  }
}

async function deleteWordPressPost(postId, slug, title) {
  if (!WP_PASSWORD) {
    throw new Error('WORDPRESS_APP_PASSWORD не установлен');
  }
  
  const auth = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64');
  
  try {
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts/${postId}?force=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log(`  ✅ Удалено: ${slug}`);
      console.log(`     "${title.rendered || title}"`);
      return { success: true };
    } else {
      const error = await response.text();
      console.log(`  ❌ Ошибка: ${slug} - ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`  ❌ Ошибка: ${slug} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧹 ПРОСТАЯ ОЧИСТКА WORDPRESS');
  console.log('═'.repeat(60));
  console.log(`\n🎯 Цель: Удалить ${100 - KEEP_SLUGS.size}+ статей из WordPress\n`);
  
  // Проверка credentials
  if (!WP_PASSWORD) {
    console.log('❌ ОШИБКА: WORDPRESS_APP_PASSWORD не установлен!');
    console.log('\nУстановите переменную окружения:');
    console.log('export WORDPRESS_APP_PASSWORD="ваш_пароль"\n');
    process.exit(1);
  }
  
  try {
    // 1. Получаем все статьи
    const wpArticles = await getWordPressArticles();
    
    // 2. Находим статьи на удаление
    const toDelete = wpArticles.filter(article => !KEEP_SLUGS.has(article.slug));
    
    console.log('\n' + '─'.repeat(60));
    console.log('📊 АНАЛИЗ:');
    console.log('─'.repeat(60));
    console.log(`📁 В WordPress: ${wpArticles.length} статей`);
    console.log(`✅ Оставить (в Supabase): ${KEEP_SLUGS.size} статей`);
    console.log(`🗑️  На удаление: ${toDelete.length} статей`);
    console.log('─'.repeat(60));
    
    if (toDelete.length === 0) {
      console.log('\n✅ Нечего удалять! WordPress уже чистый.\n');
      return;
    }
    
    // 3. Показываем примеры
    console.log('\n📝 Первые 15 статей на удаление:');
    toDelete.slice(0, 15).forEach((article, i) => {
      console.log(`   ${i + 1}. ${article.slug}`);
    });
    if (toDelete.length > 15) {
      console.log(`   ... и еще ${toDelete.length - 15} статей`);
    }
    
    console.log('\n⚠️  ВНИМАНИЕ: Статьи будут БЕЗВОЗВРАТНО УДАЛЕНЫ!');
    console.log('⏳ Начинаю через 5 секунд...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Удаляем по одной с задержкой
    let deleted = 0;
    let failed = 0;
    
    console.log('🗑️  Начинаю удаление...\n');
    
    for (let i = 0; i < toDelete.length; i++) {
      const article = toDelete[i];
      console.log(`[${i + 1}/${toDelete.length}]`);
      
      const result = await deleteWordPressPost(article.id, article.slug, article.title);
      
      if (result.success) {
        deleted++;
      } else {
        failed++;
      }
      
      // Задержка 1 секунда между удалениями
      if (i < toDelete.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('═'.repeat(60));
    console.log(`✅ Успешно удалено: ${deleted}`);
    console.log(`❌ Ошибок: ${failed}`);
    console.log(`📁 Осталось: ${wpArticles.length - deleted} статей`);
    console.log('═'.repeat(60));
    console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА!\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    process.exit(1);
  }
}

main();

