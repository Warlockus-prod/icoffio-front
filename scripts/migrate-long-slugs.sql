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


-- Очистка кеша (опционально)
DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';
