-- v10.3.0: Extend telegram_image_library for persistent image library
-- Adds source_type, alt_text, author, article_id columns

ALTER TABLE telegram_image_library
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS author VARCHAR(255),
  ADD COLUMN IF NOT EXISTS article_id INTEGER;

-- Index on source_type for filtering
CREATE INDEX IF NOT EXISTS idx_image_source_type ON telegram_image_library(source_type);
-- Index on article_id for article-specific lookups
CREATE INDEX IF NOT EXISTS idx_image_article_id ON telegram_image_library(article_id);
