/**
 * 🧪 ТЕСТОВЫЙ СКРИПТ ДЛЯ ПРОВЕРКИ URL ПАРСЕРА
 * Использование: npx tsx scripts/test-url-parser.ts <URL>
 */

import { enhancedUrlParserService } from '../lib/enhanced-url-parser-service';

const testUrl = process.argv[2];

if (!testUrl) {
  console.error('❌ Ошибка: URL не указан');
  console.log('Использование: npx tsx scripts/test-url-parser.ts <URL>');
  console.log('Пример: npx tsx scripts/test-url-parser.ts https://wylsa.com/android-pc-emulation/');
  process.exit(1);
}

async function testParser() {
  console.log(`\n🧪 Тестирование URL парсера\n`);
  console.log(`📍 URL: ${testUrl}\n`);
  console.log(`⏳ Парсинг...\n`);
  
  const startTime = Date.now();
  
  try {
    const result = await enhancedUrlParserService.extractContent(testUrl);
    const duration = Date.now() - startTime;
    
    console.log(`✅ УСПЕШНО! (${duration}ms)\n`);
    console.log(`📄 РЕЗУЛЬТАТЫ:\n`);
    console.log(`  Заголовок: ${result.title}`);
    console.log(`  Источник: ${result.source}`);
    console.log(`  Сайт: ${result.siteName || 'N/A'}`);
    console.log(`  Категория: ${result.category}`);
    console.log(`  Язык: ${result.language}`);
    console.log(`  Автор: ${result.author || 'N/A'}`);
    console.log(`  Дата публикации: ${result.publishedAt || 'N/A'}`);
    console.log(`  Изображение: ${result.image ? '✅ Да' : '❌ Нет'}`);
    if (result.image) {
      console.log(`    URL: ${result.image.substring(0, 80)}...`);
    }
    console.log(`  Excerpt: ${result.excerpt?.substring(0, 150) || 'N/A'}...`);
    console.log(`  Контент: ${result.content.length} символов`);
    console.log(`\n📝 PREVIEW КОНТЕНТА (первые 500 символов):\n`);
    console.log(result.content.substring(0, 500) + '...\n');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ОШИБКА! (${duration}ms)\n`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testParser();

