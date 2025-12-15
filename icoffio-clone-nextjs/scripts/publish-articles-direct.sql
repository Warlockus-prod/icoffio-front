-- ПУБЛИКАЦИЯ СТАТЕЙ В SUPABASE
-- Обновляет поле published = true для хороших статей

-- Опубликовать TechCrunch статьи
UPDATE published_articles 
SET published = true, updated_at = NOW()
WHERE slug_en = 'techcrunch-startup-and-technology-news-en' 
   OR slug_pl = 'techcrunch-startup-and-technology-news-pl';

-- Опубликовать Wylsa GameHub статьи  
UPDATE published_articles
SET published = true, updated_at = NOW()
WHERE slug_en = 'how-to-run-any-pc-game-on-android-a-review-of-the-gamehub-em-en'
   OR slug_pl = 'kak-zapustit-lyubuyu-igru-s-pk-na-android-obzor-emulyatora-g-pl';

-- Опубликовать OpenAI News
UPDATE published_articles
SET published = true, updated_at = NOW()
WHERE slug_en = 'openai-news' OR slug_pl = 'openai-news';

-- УДАЛИТЬ ТЕСТОВЫЕ СТАТЬИ

-- Удалить Revolutionary Breakthrough (тест)
DELETE FROM published_articles
WHERE slug_en LIKE 'revolutionary-breakthrough-in-quantum-computing%'
   OR slug_pl LIKE 'revolutionary-breakthrough-in-quantum-computing%';

-- Удалить AI Revolution 2025 (тест)
DELETE FROM published_articles
WHERE slug_en = 'ai-revolution-2025-en'
   OR slug_pl = 'ai-revolution-2025-pl';

-- Удалить iPhone 16 Pro Max (тест)
DELETE FROM published_articles
WHERE slug_en LIKE 'iphone-16-pro-max-vs-iphone-15-pro-max%'
   OR slug_pl LIKE 'iphone-16-pro-max-vs-iphone-15-pro-max%';

-- Проверка результата
SELECT 
  id,
  title,
  slug_en,
  slug_pl,
  published,
  created_at
FROM published_articles
ORDER BY created_at DESC
LIMIT 20;

