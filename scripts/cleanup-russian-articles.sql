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
