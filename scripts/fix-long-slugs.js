/**
 * ✅ МИГРАЦИЯ СУЩЕСТВУЮЩИХ СТАТЕЙ С ДЛИННЫМИ SLUG'АМИ
 * 
 * Скрипт для исправления уже созданных статей с проблемными slug'ами
 */

const fs = require('fs');
const path = require('path');

// Импортируем нашу утилиту (требует транспиляции в продакшне)
// const { generateSafeSlug, addLanguageSuffix } = require('../lib/slug-utils');

// Временная реализация для скрипта
function generateSafeSlug(title, maxLength = 50) {
  if (!title || typeof title !== 'string') {
    return 'untitled';
  }

  return title
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s\u0400-\u04FF-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength)
    .replace(/-+$/, '');
}

function addLanguageSuffix(baseSlug, language, maxLength = 50) {
  const suffix = `-${language}`;
  const maxBaseLength = maxLength - suffix.length;
  const trimmedSlug = baseSlug.substring(0, maxBaseLength).replace(/-+$/, '');
  return `${trimmedSlug}${suffix}`;
}

console.log('🔧 Начинаем миграцию статей с длинными slug\'ами...\n');

// Список проблемных статей (можно расширить)
const problematicSlugs = [
  {
    old: 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en',
    title: 'iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution',
    language: 'en'
  },
  {
    old: 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-pl', 
    title: 'iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution',
    language: 'pl'
  }
];

console.log('📋 Найденные проблемные slug\'ы:\n');

const migrations = [];

problematicSlugs.forEach((item, index) => {
  console.log(`${index + 1}. Проблемный slug: "${item.old}"`);
  console.log(`   Длина: ${item.old.length} символов`);
  
  const newSlug = addLanguageSuffix(generateSafeSlug(item.title, 45), item.language);
  console.log(`   Новый slug: "${newSlug}"`);
  console.log(`   Новая длина: ${newSlug.length} символов`);
  
  migrations.push({
    oldSlug: item.old,
    newSlug: newSlug,
    title: item.title,
    language: item.language,
    savings: item.old.length - newSlug.length
  });
  
  console.log(`   Сокращение: ${item.old.length - newSlug.length} символов\n`);
});

// Создаем SQL запросы для миграции
console.log('📝 Генерируем SQL запросы для миграции:\n');

const sqlQueries = migrations.map(migration => {
  return `-- Миграция: ${migration.title} (${migration.language.toUpperCase()})
UPDATE wp_posts 
SET post_name = '${migration.newSlug}' 
WHERE post_name = '${migration.oldSlug}' 
  AND post_type = 'post' 
  AND post_status = 'publish';

-- Обновляем мета-данные если нужно
UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, '${migration.oldSlug}', '${migration.newSlug}') 
WHERE meta_value LIKE '%${migration.oldSlug}%';
`;
});

// Сохраняем в файл
const migrationSQL = `-- ✅ МИГРАЦИЯ СТАТЕЙ С ДЛИННЫМИ SLUG'АМИ
-- Сгенерировано: ${new Date().toISOString()}
-- Всего миграций: ${migrations.length}

${sqlQueries.join('\n')}

-- Очистка кеша (опционально)
DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';
`;

const outputPath = path.join(__dirname, 'migrate-long-slugs.sql');
fs.writeFileSync(outputPath, migrationSQL);

console.log('💾 SQL файл для миграции сохранен:', outputPath);
console.log('\n📊 Сводка миграции:');
console.log(`   Статей для миграции: ${migrations.length}`);
console.log(`   Среднее сокращение: ${Math.round(migrations.reduce((sum, m) => sum + m.savings, 0) / migrations.length)} символов`);
console.log('\n✅ Миграция подготовлена!');
console.log('\n🚨 ВНИМАНИЕ: Перед выполнением SQL запросов:');
console.log('   1. Сделайте бэкап базы данных');
console.log('   2. Проверьте запросы в тестовой среде');
console.log('   3. Обновите любые кешированные URL');
console.log('   4. Настройте 301 редиректы для старых URL');
