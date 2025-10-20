-- ✅ ПОЛНОЕ ИСПРАВЛЕНИЕ СТАРЫХ ОШИБОК ICOFFIO v1.4.0
-- Обновлено: 2025-10-20T15:45:00.000Z
-- 
-- Этот скрипт исправляет:
-- 1. Удаляет русские статьи (язык больше не поддерживается)
-- 2. Применяет миграцию длинных slug'ов  
-- 3. Настраивает 301 редиректы
--
-- ⚠️ ВНИМАНИЕ: Обязательно создайте бэкап базы данных перед выполнением!

START TRANSACTION;

-- ✅ УДАЛЕНИЕ РУССКИХ СТАТЕЙ
-- Русский язык больше не поддерживается в системе
-- Сгенерировано: 2025-10-20T13:19:24.444Z

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


-- ✅ МИГРАЦИЯ СТАТЕЙ С ДЛИННЫМИ SLUG'АМИ
-- Сгенерировано: 2025-10-20T13:10:36.663Z
-- Всего миграций: 2

-- Миграция: iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution (EN)
UPDATE wp_posts 
SET post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-en' 
WHERE post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en' 
  AND post_type = 'post' 
  AND post_status = 'publish';

-- Обновляем мета-данные если нужно
UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en', 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-en') 
WHERE meta_value LIKE '%iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en%';

-- Миграция: iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution (PL)
UPDATE wp_posts 
SET post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-pl' 
WHERE post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-pl' 
  AND post_type = 'post' 
  AND post_status = 'publish';

-- Обновляем мета-данные если нужно
UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-pl', 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-pl') 
WHERE meta_value LIKE '%iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-pl%';


-- ===============================================
-- НОВЫЕ ПРОБЛЕМНЫЕ СТАТЬИ (добавлено v1.4.0)
-- ===============================================

-- Миграция: Revolutionary Breakthrough in Quantum Computing Technology (130+ символов)
UPDATE wp_posts
SET post_name = 'revolutionary-breakthrough-in-quantum-computin-en'
WHERE post_name = 'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en'
  AND post_type = 'post'
  AND post_status = 'publish';

-- Обновляем мета-данные для новой статьи
UPDATE wp_postmeta
SET meta_value = REPLACE(meta_value, 'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en', 'revolutionary-breakthrough-in-quantum-computin-en')
WHERE meta_value LIKE '%revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en%';

-- Удаляем РУССКУЮ версию той же статьи (язык больше не поддерживается)
DELETE FROM wp_posts
WHERE post_name = 'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-ru'
  AND post_type = 'post';

-- Удаляем связанные мета-данные русской версии
DELETE FROM wp_postmeta
WHERE meta_value LIKE '%revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-ru%';

-- Очистка кеша (опционально)
DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';


-- ✅ НАСТРОЙКА 301 РЕДИРЕКТОВ ДЛЯ СТАРЫХ URL
-- Сгенерировано: 2025-10-20T13:19:24.445Z

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


-- Финальная очистка и оптимизация
OPTIMIZE TABLE wp_posts;
OPTIMIZE TABLE wp_postmeta; 
OPTIMIZE TABLE wp_term_relationships;

COMMIT;

-- ✅ Миграция завершена успешно!
