-- =============================================================
-- Migration: 20260521_info_feed_items_description_locale
-- Per-locale descriptions for RSS items (v10.16.0). Companion to title_en/pl.
--
-- Cost note: descriptions are ~3× the tokens of titles, so the translate cron
-- handles them in a smaller batch (limit 30) and admin runs them less often.
--
-- Idempotent.
-- =============================================================

ALTER TABLE info_feed_items
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_pl TEXT;

-- Partial indexes for the "find untranslated description" worker query
CREATE INDEX IF NOT EXISTS idx_items_missing_desc_pl
  ON info_feed_items(feed_id, published_at DESC NULLS LAST)
  WHERE description_pl IS NULL AND description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_missing_desc_en
  ON info_feed_items(feed_id, published_at DESC NULLS LAST)
  WHERE description_en IS NULL AND description IS NOT NULL;

COMMENT ON COLUMN info_feed_items.description_en IS 'GPT-translated English description. NULL until translate batch runs.';
COMMENT ON COLUMN info_feed_items.description_pl IS 'GPT-translated Polish description. NULL until translate batch runs.';
