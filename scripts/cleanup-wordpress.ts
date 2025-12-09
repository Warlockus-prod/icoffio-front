/**
 * CLEANUP WORDPRESS - Удаление статей, которых нет в Supabase
 * 
 * Этот скрипт:
 * 1. Получает список статей из Supabase (источник правды)
 * 2. Получает список статей из WordPress
 * 3. Находит разницу (статьи только в WordPress)
 * 4. Удаляет лишние статьи из WordPress
 * 
 * Использование:
 * npx ts-node scripts/cleanup-wordpress.ts
 */

const API_BASE = 'https://app.icoffio.com';

interface Article {
  slug: string;
  title: string;
}

async function getSupabaseArticles(): Promise<Set<string>> {
  console.log('📊 Получаю статьи из Supabase...');
  
  try {
    // Получаем статьи из admin panel API
    const response = await fetch(`${API_BASE}/api/supabase-articles?action=get-all&limit=200`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Supabase API error: ${data.error}`);
    }
    
    const slugs = new Set<string>();
    
    // Собираем slug для EN и PL версий
    if (data.articles && Array.isArray(data.articles)) {
      data.articles.forEach((article: any) => {
        if (article.slug_en) slugs.add(article.slug_en);
        if (article.slug_pl) slugs.add(article.slug_pl);
        if (article.slug) slugs.add(article.slug);
      });
    }
    
    console.log(`✅ Найдено ${slugs.size} уникальных slug в Supabase`);
    return slugs;
    
  } catch (error) {
    console.error('❌ Ошибка при получении статей из Supabase:', error);
    throw error;
  }
}

async function getWordPressArticles(): Promise<Article[]> {
  console.log('📰 Получаю статьи из WordPress...');
  
  try {
    const response = await fetch(`${API_BASE}/api/wordpress-articles`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`WordPress API error: ${data.error}`);
    }
    
    const articles: Article[] = data.articles.map((article: any) => ({
      slug: article.slug,
      title: article.title
    }));
    
    console.log(`✅ Найдено ${articles.length} статей в WordPress`);
    return articles;
    
  } catch (error) {
    console.error('❌ Ошибка при получении статей из WordPress:', error);
    throw error;
  }
}

async function deleteWordPressArticles(slugs: string[]): Promise<void> {
  console.log(`\n🗑️  Удаляю ${slugs.length} статей из WordPress...`);
  
  // Разбиваем на батчи по 10 статей
  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  
  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    batches.push(slugs.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 Разбито на ${batches.length} батчей по ${BATCH_SIZE} статей`);
  
  let totalDeleted = 0;
  let totalFailed = 0;
  let totalNotFound = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n⏳ Обработка батча ${i + 1}/${batches.length}...`);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/bulk-delete-wordpress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: batch })
      });
      
      const result = await response.json();
      
      if (result.success) {
        totalDeleted += result.deleted || 0;
        totalFailed += result.failed || 0;
        totalNotFound += result.notFound || 0;
        
        console.log(`  ✅ Удалено: ${result.deleted}`);
        console.log(`  ⚠️  Не найдено: ${result.notFound}`);
        console.log(`  ❌ Ошибок: ${result.failed}`);
      } else {
        console.log(`  ❌ Батч провален: ${result.error}`);
        totalFailed += batch.length;
      }
      
      // Задержка между батчами
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`  ❌ Ошибка батча ${i + 1}:`, error);
      totalFailed += batch.length;
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('═'.repeat(50));
  console.log(`✅ Успешно удалено: ${totalDeleted}`);
  console.log(`⚠️  Не найдено: ${totalNotFound}`);
  console.log(`❌ Ошибок: ${totalFailed}`);
  console.log('═'.repeat(50));
}

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('🧹 ОЧИСТКА WORDPRESS ОТ НЕСУЩЕСТВУЮЩИХ СТАТЕЙ');
  console.log('═'.repeat(50));
  console.log('\nЦель: Удалить статьи из WordPress, которых нет в Supabase\n');
  
  try {
    // 1. Получаем статьи из обеих баз
    const [supabaseSlugs, wpArticles] = await Promise.all([
      getSupabaseArticles(),
      getWordPressArticles()
    ]);
    
    // 2. Находим статьи только в WordPress (на удаление)
    const toDelete: Article[] = wpArticles.filter(article => 
      !supabaseSlugs.has(article.slug)
    );
    
    console.log('\n' + '─'.repeat(50));
    console.log('📊 АНАЛИЗ:');
    console.log('─'.repeat(50));
    console.log(`📁 В Supabase: ${supabaseSlugs.size} статей`);
    console.log(`📁 В WordPress: ${wpArticles.length} статей`);
    console.log(`🗑️  На удаление: ${toDelete.length} статей`);
    console.log('─'.repeat(50));
    
    if (toDelete.length === 0) {
      console.log('\n✅ Базы синхронизированы! Удаление не требуется.');
      return;
    }
    
    // 3. Показываем примеры статей на удаление
    console.log('\n📝 Примеры статей на удаление (первые 10):');
    toDelete.slice(0, 10).forEach((article, i) => {
      console.log(`   ${i + 1}. ${article.slug}`);
      console.log(`      "${article.title}"`);
    });
    
    if (toDelete.length > 10) {
      console.log(`   ... и еще ${toDelete.length - 10} статей`);
    }
    
    // 4. Подтверждение (в production можно добавить prompt)
    console.log('\n⚠️  ВНИМАНИЕ: Эти статьи будут УДАЛЕНЫ из WordPress!');
    console.log('⏳ Начинаю удаление через 3 секунды...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Удаляем
    const slugsToDelete = toDelete.map(a => a.slug);
    await deleteWordPressArticles(slugsToDelete);
    
    console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('🎯 WordPress и Supabase синхронизированы!\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запуск
main();

