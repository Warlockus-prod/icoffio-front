/**
 * ✅ ИСПРАВЛЕНИЕ СТАРЫХ ОШИБОК ИЗ РЕКОМЕНДАЦИЙ
 * 
 * 1. Удаляет русские статьи (язык больше не поддерживается)
 * 2. Применяет миграцию длинных slug'ов
 * 3. Создает 301 редиректы для старых URL
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 ИСПРАВЛЕНИЕ СТАРЫХ ОШИБОК ИЗ РЕКОМЕНДАЦИЙ');
console.log('================================================\n');

// 1. УДАЛЕНИЕ РУССКИХ СТАТЕЙ
console.log('1️⃣ Удаление русских статей...\n');

const russianCleanupSQL = `-- ✅ УДАЛЕНИЕ РУССКИХ СТАТЕЙ
-- Русский язык больше не поддерживается в системе
-- Сгенерировано: ${new Date().toISOString()}

-- Находим все русские статьи (slug оканчивается на -ru)
SELECT post_title, post_name, post_date 
FROM wp_posts 
WHERE post_name LIKE '%-ru' 
  AND post_type = 'post' 
  AND post_status = 'publish';

-- Удаляем русские статьи
DELETE FROM wp_posts 
WHERE post_name LIKE '%-ru' 
  AND post_type = 'post';

-- Удаляем связанные мета-данные русских статей
DELETE FROM wp_postmeta 
WHERE post_id NOT IN (SELECT ID FROM wp_posts WHERE post_type = 'post');

-- Удаляем связанные термины русских статей
DELETE FROM wp_term_relationships 
WHERE object_id NOT IN (SELECT ID FROM wp_posts WHERE post_type = 'post');

-- Очистка кеша
DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';

COMMIT;
`;

// 2. МИГРАЦИЯ ДЛИННЫХ SLUG'ОВ (из ранее созданного файла)
console.log('2️⃣ Применение миграции длинных slug\'ов...\n');

let migrationSQL = '';
try {
  const migrationPath = path.join(__dirname, 'migrate-long-slugs.sql');
  if (fs.existsSync(migrationPath)) {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Найден файл миграции длинных slug\'ов');
  } else {
    console.log('⚠️ Файл миграции не найден, создаем базовый...');
    migrationSQL = `-- Базовая миграция длинных slug'ов
UPDATE wp_posts 
SET post_name = SUBSTRING(post_name, 1, 50) 
WHERE LENGTH(post_name) > 50 
  AND post_type = 'post' 
  AND post_status = 'publish';`;
  }
} catch (error) {
  console.log('⚠️ Ошибка чтения файла миграции:', error.message);
}

// 3. СОЗДАНИЕ 301 РЕДИРЕКТОВ
console.log('3️⃣ Создание 301 редиректов...\n');

const redirectsSQL = `-- ✅ НАСТРОЙКА 301 РЕДИРЕКТОВ ДЛЯ СТАРЫХ URL
-- Сгенерировано: ${new Date().toISOString()}

-- Создаем таблицу редиректов если не существует
CREATE TABLE IF NOT EXISTS wp_redirects (
  id int(11) NOT NULL AUTO_INCREMENT,
  old_url varchar(500) NOT NULL,
  new_url varchar(500) NOT NULL,
  status_code int(3) DEFAULT 301,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_old_url (old_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Редиректы для известных длинных slug'ов
INSERT IGNORE INTO wp_redirects (old_url, new_url, status_code) VALUES
('/en/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en', '/en/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-en', 301),
('/pl/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-pl', '/pl/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-pl', 301);

-- Редиректы для русских статей на английские версии  
INSERT IGNORE INTO wp_redirects (old_url, new_url, status_code) VALUES
('/ru/article/ai-revolution-2025-ru', '/en/article/ai-revolution-2025-en', 301);

COMMIT;
`;

// 4. WORDPRESS .HTACCESS ПРАВИЛА
console.log('4️⃣ Создание .htaccess правил...\n');

const htaccessRules = `# ✅ АВТОМАТИЧЕСКИЕ 301 РЕДИРЕКТЫ ДЛЯ ДЛИННЫХ SLUG'ОВ
# Добавить в .htaccess WordPress сайта

# Редиректы для длинных iPhone статей
RewriteRule ^([^/]+)/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-(.+)$ /$1/article/iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-$2 [R=301,L]

# Редиректы русских статей на английские
RewriteRule ^ru/article/(.+)-ru/?$ /en/article/$1-en [R=301,L]

# Общий редирект для статей длиннее 50 символов
RewriteCond %{REQUEST_URI} ^/([^/]+)/article/([^/]{51,})/?$
RewriteRule ^([^/]+)/article/(.{47}).{4,}(..)/?$ /$1/article/$2$3 [R=301,L]
`;

// ОБЪЕДИНЯЕМ ВСЕ В ОДИН ФАЙЛ
const fullMigrationSQL = `-- ✅ ПОЛНОЕ ИСПРАВЛЕНИЕ СТАРЫХ ОШИБОК ICOFFIO
-- Сгенерировано: ${new Date().toISOString()}
-- 
-- Этот скрипт исправляет:
-- 1. Удаляет русские статьи (язык больше не поддерживается)
-- 2. Применяет миграцию длинных slug'ов  
-- 3. Настраивает 301 редиректы
--
-- ⚠️ ВНИМАНИЕ: Обязательно создайте бэкап базы данных перед выполнением!

START TRANSACTION;

${russianCleanupSQL}

${migrationSQL}

${redirectsSQL}

-- Финальная очистка и оптимизация
OPTIMIZE TABLE wp_posts;
OPTIMIZE TABLE wp_postmeta; 
OPTIMIZE TABLE wp_term_relationships;

COMMIT;

-- ✅ Миграция завершена успешно!
`;

// Сохраняем все файлы
const outputDir = __dirname;

fs.writeFileSync(path.join(outputDir, 'fix-all-old-errors.sql'), fullMigrationSQL);
fs.writeFileSync(path.join(outputDir, 'cleanup-russian-articles.sql'), russianCleanupSQL);
fs.writeFileSync(path.join(outputDir, 'setup-redirects.htaccess'), htaccessRules);

console.log('💾 Созданы файлы:');
console.log('   📄 fix-all-old-errors.sql - Полная миграция');
console.log('   📄 cleanup-russian-articles.sql - Очистка русских статей');  
console.log('   📄 setup-redirects.htaccess - Правила Apache');

console.log('\n📋 ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ:');
console.log('');
console.log('1️⃣ БАЗА ДАННЫХ:');
console.log('   mysql -u username -p database_name < fix-all-old-errors.sql');
console.log('');
console.log('2️⃣ ВЕРОВЫЙ СЕРВЕР:'); 
console.log('   Добавить содержимое setup-redirects.htaccess в .htaccess');
console.log('');
console.log('3️⃣ ПРОВЕРКА:');
console.log('   - Проверить работу статей после миграции');
console.log('   - Убедиться что редиректы работают'); 
console.log('   - Очистить кеш WordPress и CDN');

console.log('\n✅ ВСЕ ИСПРАВЛЕНИЯ ГОТОВЫ К ПРИМЕНЕНИЮ!');
