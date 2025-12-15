-- ============================================
-- BASE SCHEMA для published_articles
-- Создание базовой таблицы (если её нет)
-- ============================================

-- Создаем таблицу published_articles (базовая версия)
CREATE TABLE IF NOT EXISTS published_articles (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL DEFAULT 0,
  job_id VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  url_en TEXT,
  url_pl TEXT,
  post_id_en INTEGER,
  post_id_pl INTEGER,
  category VARCHAR(100),
  word_count INTEGER,
  languages TEXT[] DEFAULT '{}',
  processing_time INTEGER,
  source VARCHAR(50),
  original_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Теперь добавляем новые колонки для v7.14.0
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
CREATE INDEX IF NOT EXISTS idx_articles_chat_id ON published_articles(chat_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON published_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created ON published_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON published_articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_slug_en ON published_articles(slug_en);
CREATE INDEX IF NOT EXISTS idx_articles_slug_pl ON published_articles(slug_pl);
CREATE INDEX IF NOT EXISTS idx_articles_published ON published_articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON published_articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_category_published ON published_articles(category, published);

-- Full-text search индексы для поиска по контенту
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON published_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_content_search ON published_articles USING gin(to_tsvector('english', coalesce(content_en, '')));

-- Комментарии
COMMENT ON TABLE published_articles IS 'Опубликованные статьи с полным контентом (Supabase storage) v7.14.0';
COMMENT ON COLUMN published_articles.slug_en IS 'Slug для английской версии (с суффиксом -en)';
COMMENT ON COLUMN published_articles.slug_pl IS 'Slug для польской версии (с суффиксом -pl)';
COMMENT ON COLUMN published_articles.content_en IS 'Полный контент статьи на английском';
COMMENT ON COLUMN published_articles.content_pl IS 'Полный контент статьи на польском';
COMMENT ON COLUMN published_articles.published IS 'Опубликована ли статья (видна на сайте)';
COMMENT ON COLUMN published_articles.featured IS 'Избранная статья (для главной страницы)';

-- Проверка
SELECT 'published_articles table created/updated successfully!' as status;

