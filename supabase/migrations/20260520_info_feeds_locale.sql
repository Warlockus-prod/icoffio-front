-- =============================================================
-- Migration: 20260520_info_feeds_locale
-- Add per-locale titles + language column to info_feeds.
-- Backfills:
--   * title_en / title_pl  ← copy from current title (UI falls back when empty)
--   * lang                 ← heuristic from feed_url domain (best-effort, admin can correct)
--
-- Idempotent. Safe to re-run.
-- =============================================================

-- 1. Add columns
ALTER TABLE info_feeds
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_pl TEXT,
  ADD COLUMN IF NOT EXISTS lang     VARCHAR(5);

-- 2. Backfill title_en/title_pl from existing title (so UI keeps showing something)
UPDATE info_feeds SET title_en = title WHERE title_en IS NULL OR title_en = '';
UPDATE info_feeds SET title_pl = title WHERE title_pl IS NULL OR title_pl = '';

-- 3. Auto-detect lang from feed_url domain (only where lang IS NULL)
--    Heuristic priority:
--      - TLDs: .ru → ru, .pl → pl, .de → de, .fr → fr, .ua → uk
--      - Known Russian outlets without .ru TLD: meduza.io, zona.media → ru
--      - Known Polish: iab.org.pl, marketingiwbiznesie.pl → pl
--      - Everything else → en (most-common fallback for international RSS)
UPDATE info_feeds
   SET lang = CASE
     -- Russian sources
     WHEN feed_url ~* '\.ru/'        OR feed_url ~* '\.ru$' THEN 'ru'
     WHEN feed_url ~* 'meduza\.io'   THEN 'ru'
     WHEN feed_url ~* 'zona\.media'  THEN 'ru'
     WHEN feed_url ~* 'tass\.ru'     THEN 'ru'
     WHEN feed_url ~* 'forklog'      THEN 'ru'
     WHEN feed_url ~* '\.ixbt\.com'  THEN 'ru'

     -- Polish sources
     WHEN feed_url ~* '\.pl/'   OR feed_url ~* '\.pl$'   THEN 'pl'
     WHEN feed_url ~* '\.org\.pl'                         THEN 'pl'

     -- Ukrainian
     WHEN feed_url ~* '\.ua/'   OR feed_url ~* '\.ua$'   THEN 'uk'

     -- German
     WHEN feed_url ~* '\.de/'   OR feed_url ~* '\.de$'   THEN 'de'

     -- French
     WHEN feed_url ~* '\.fr/'   OR feed_url ~* '\.fr$'   THEN 'fr'

     -- Default: English (safest for the international tech/news feeds we have)
     ELSE 'en'
   END
 WHERE lang IS NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_info_feeds_lang ON info_feeds(lang);

COMMENT ON COLUMN info_feeds.title_en IS 'Localized feed title for English UI. Falls back to title if empty.';
COMMENT ON COLUMN info_feeds.title_pl IS 'Localized feed title for Polish UI. Falls back to title if empty.';
COMMENT ON COLUMN info_feeds.lang IS
  'ISO-639-1 source language. Used for UI filtering. Auto-detected from feed_url on insert; admin may override.';
