-- =============================================================
-- Migration: 20260520_info_feed_items_locale
-- Per-locale titles for RSS items (so PL users see "BBC News headline in Polish",
-- not source language).
--
-- Strategy: title-only translation for v10.14.0 to keep cost low. Description
-- can be added later (5-10× more tokens, $$$).
--
-- No backfill — initial values are NULL until admin runs the translate endpoint.
-- Render-side helper falls back to original `title`.
--
-- Idempotent.
-- =============================================================

ALTER TABLE info_feed_items
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_pl TEXT;

-- Composite index for the translate-batch worker that finds untranslated items.
-- Conditional indexes keep size minimal while still benefitting the cron query.
CREATE INDEX IF NOT EXISTS idx_items_missing_pl
  ON info_feed_items(feed_id, published_at DESC NULLS LAST)
  WHERE title_pl IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_missing_en
  ON info_feed_items(feed_id, published_at DESC NULLS LAST)
  WHERE title_en IS NULL;

COMMENT ON COLUMN info_feed_items.title_en IS 'GPT-translated English title. NULL until translate batch runs.';
COMMENT ON COLUMN info_feed_items.title_pl IS 'GPT-translated Polish title. NULL until translate batch runs.';
