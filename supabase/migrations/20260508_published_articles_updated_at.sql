-- =============================================================
-- Migration: 20260508_published_articles_updated_at
-- Adds missing `updated_at` column + trigger to published_articles.
--
-- Context: lib/data.ts (line ~58) reads `article.updated_at ?? article.created_at`,
-- but the column never existed in init/001_schema.sql. Adding it closes that gap
-- and gives us proper cache-invalidation signals for ISR.
--
-- Idempotent — safe to run multiple times.
-- =============================================================

-- 1. Add the column (no-op if already exists)
ALTER TABLE published_articles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Backfill existing rows so updated_at = created_at where NULL
UPDATE published_articles
   SET updated_at = COALESCE(created_at, NOW())
 WHERE updated_at IS NULL;

-- 3. Auto-update trigger using the shared function from telegram_jobs
--    (update_updated_at_column() is defined in init/001_schema.sql line 76)
DROP TRIGGER IF EXISTS update_published_articles_updated_at ON published_articles;
CREATE TRIGGER update_published_articles_updated_at
  BEFORE UPDATE ON published_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Helpful index for admin sort-by-updated queries
CREATE INDEX IF NOT EXISTS idx_articles_updated
  ON published_articles(updated_at DESC);

COMMENT ON COLUMN published_articles.updated_at IS
  'Last modification timestamp. Auto-updated by trigger on UPDATE.';
