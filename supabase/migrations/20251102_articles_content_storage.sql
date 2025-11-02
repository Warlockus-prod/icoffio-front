-- ============================================
-- ARTICLES CONTENT STORAGE
-- Migration v7.14.0 - Remove WordPress dependency
-- Date: 2025-11-02
-- ============================================

-- Расширяем таблицу published_articles для полного хранения контента
ALTER TABLE published_articles 
  ADD COLUMN IF NOT EXISTS slug_en TEXT,
  ADD COLUMN IF NOT EXISTS slug_pl TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT,
  ADD COLUMN IF NOT EXISTS content_pl TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_pl TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'icoffio Bot',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_articles_slug_en ON published_articles(slug_en);
CREATE INDEX IF NOT EXISTS idx_articles_slug_pl ON published_articles(slug_pl);
CREATE INDEX IF NOT EXISTS idx_articles_published ON published_articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON published_articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_category_published ON published_articles(category, published);

-- Full-text search индексы для поиска по контенту
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON published_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_content_search ON published_articles USING gin(to_tsvector('english', coalesce(content_en, '')));

-- Функция для генерации slug из заголовка
CREATE OR REPLACE FUNCTION generate_slug(title TEXT, language TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Генерируем базовый slug
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug, 1, 100);
  
  -- Добавляем суффикс языка
  IF language = 'pl' THEN
    base_slug := base_slug || '-pl';
  ELSIF language = 'en' THEN
    base_slug := base_slug || '-en';
  END IF;
  
  -- Проверяем уникальность
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM published_articles 
    WHERE slug_en = final_slug OR slug_pl = final_slug
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- View для удобного получения статей с обоими языками
CREATE OR REPLACE VIEW articles_full AS
SELECT 
  id,
  chat_id,
  job_id,
  title,
  slug_en,
  slug_pl,
  content_en,
  content_pl,
  excerpt_en,
  excerpt_pl,
  image_url,
  category,
  author,
  tags,
  word_count,
  languages,
  processing_time,
  source,
  original_input,
  meta_description,
  published,
  featured,
  created_at,
  url_en,
  url_pl,
  post_id_en,
  post_id_pl
FROM published_articles
WHERE published = true
ORDER BY created_at DESC;

-- View для получения статей по языку
CREATE OR REPLACE VIEW articles_by_language AS
SELECT 
  id,
  'en' as language,
  slug_en as slug,
  title,
  content_en as content,
  excerpt_en as excerpt,
  image_url,
  category,
  author,
  tags,
  word_count,
  created_at,
  published,
  featured
FROM published_articles
WHERE content_en IS NOT NULL AND published = true
UNION ALL
SELECT 
  id,
  'pl' as language,
  slug_pl as slug,
  title,
  content_pl as content,
  excerpt_pl as excerpt,
  image_url,
  category,
  author,
  tags,
  word_count,
  created_at,
  published,
  featured
FROM published_articles
WHERE content_pl IS NOT NULL AND published = true;

-- Функция для получения популярных статей по языку
CREATE OR REPLACE FUNCTION get_popular_articles(lang TEXT, article_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  view_count BIGINT
) AS $$
BEGIN
  IF lang = 'en' THEN
    RETURN QUERY
    SELECT 
      pa.id,
      pa.slug_en as slug,
      pa.title,
      pa.excerpt_en as excerpt,
      pa.image_url,
      pa.category,
      pa.created_at,
      COALESCE(av.view_count, 0) as view_count
    FROM published_articles pa
    LEFT JOIN (
      SELECT article_slug, COUNT(*) as view_count
      FROM article_views
      WHERE article_slug LIKE '%-en'
      GROUP BY article_slug
    ) av ON pa.slug_en = av.article_slug
    WHERE pa.published = true AND pa.content_en IS NOT NULL
    ORDER BY view_count DESC, pa.created_at DESC
    LIMIT article_limit;
  ELSIF lang = 'pl' THEN
    RETURN QUERY
    SELECT 
      pa.id,
      pa.slug_pl as slug,
      pa.title,
      pa.excerpt_pl as excerpt,
      pa.image_url,
      pa.category,
      pa.created_at,
      COALESCE(av.view_count, 0) as view_count
    FROM published_articles pa
    LEFT JOIN (
      SELECT article_slug, COUNT(*) as view_count
      FROM article_views
      WHERE article_slug LIKE '%-pl'
      GROUP BY article_slug
    ) av ON pa.slug_pl = av.article_slug
    WHERE pa.published = true AND pa.content_pl IS NOT NULL
    ORDER BY view_count DESC, pa.created_at DESC
    LIMIT article_limit;
  ELSE
    RETURN QUERY
    SELECT 
      pa.id,
      COALESCE(pa.slug_en, pa.slug_pl) as slug,
      pa.title,
      COALESCE(pa.excerpt_en, pa.excerpt_pl) as excerpt,
      pa.image_url,
      pa.category,
      pa.created_at,
      0::BIGINT as view_count
    FROM published_articles pa
    WHERE pa.published = true
    ORDER BY pa.created_at DESC
    LIMIT article_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения связанных статей (по категории)
CREATE OR REPLACE FUNCTION get_related_articles(
  article_slug TEXT,
  lang TEXT,
  article_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  article_category TEXT;
BEGIN
  -- Получаем категорию текущей статьи
  SELECT pa.category INTO article_category
  FROM published_articles pa
  WHERE pa.slug_en = article_slug OR pa.slug_pl = article_slug
  LIMIT 1;
  
  -- Возвращаем связанные статьи из той же категории
  IF lang = 'en' THEN
    RETURN QUERY
    SELECT 
      pa.id,
      pa.slug_en as slug,
      pa.title,
      pa.excerpt_en as excerpt,
      pa.image_url,
      pa.category,
      pa.created_at
    FROM published_articles pa
    WHERE pa.category = article_category
      AND pa.slug_en != article_slug
      AND pa.published = true
      AND pa.content_en IS NOT NULL
    ORDER BY pa.created_at DESC
    LIMIT article_limit;
  ELSIF lang = 'pl' THEN
    RETURN QUERY
    SELECT 
      pa.id,
      pa.slug_pl as slug,
      pa.title,
      pa.excerpt_pl as excerpt,
      pa.image_url,
      pa.category,
      pa.created_at
    FROM published_articles pa
    WHERE pa.category = article_category
      AND pa.slug_pl != article_slug
      AND pa.published = true
      AND pa.content_pl IS NOT NULL
    ORDER BY pa.created_at DESC
    LIMIT article_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON TABLE published_articles IS 'Статьи с полным контентом (без зависимости от WordPress) v7.14.0';
COMMENT ON FUNCTION generate_slug IS 'Генерация уникального slug из заголовка';
COMMENT ON FUNCTION get_popular_articles IS 'Получение популярных статей по языку с учетом просмотров';
COMMENT ON FUNCTION get_related_articles IS 'Получение связанных статей по категории';
COMMENT ON VIEW articles_full IS 'Полное представление статей с обоими языками';
COMMENT ON VIEW articles_by_language IS 'Статьи разделенные по языкам (для удобного запроса)';

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Получить статью по slug (EN):
-- SELECT * FROM published_articles WHERE slug_en = 'your-article-slug-en';

-- Получить статью по slug (PL):
-- SELECT * FROM published_articles WHERE slug_pl = 'your-article-slug-pl';

-- Получить все опубликованные статьи на английском:
-- SELECT * FROM articles_by_language WHERE language = 'en' ORDER BY created_at DESC;

-- Получить топ 10 популярных статей (EN):
-- SELECT * FROM get_popular_articles('en', 10);

-- Получить связанные статьи:
-- SELECT * FROM get_related_articles('your-article-slug-en', 'en', 4);

-- Поиск по статьям (full-text search):
-- SELECT id, title, excerpt_en FROM published_articles
-- WHERE to_tsvector('english', title || ' ' || coalesce(content_en, '')) @@ plainto_tsquery('english', 'search term')
-- ORDER BY created_at DESC;

