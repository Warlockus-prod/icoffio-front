-- =============================================================
-- Migration: 20260520_info_feeds_lang_audit_fix
-- Strengthens the auto-detect heuristic for info_feeds.lang to catch cases
-- the first pass (20260520_info_feeds_locale.sql) missed:
--   * russian.rt.com (matches .com TLD, missed RU origin)
--   * novayagazeta.eu (EU domain but Russian-language)
--   * habr.com/ru/ paths
--   * Telegram-channel rows where handle doesn't disclose language
--   * Any title that contains Cyrillic — strongest signal of Russian source
--
-- This migration was prompted by a real audit: 7 feeds were tagged 'en' but
-- were actually Russian-language sources. Production fix was applied manually;
-- this migration captures the lesson for fresh installs.
--
-- Idempotent.
-- =============================================================

-- Rule 1: any feed whose title contains Cyrillic letters is Russian.
-- (Brand names like "ТАСС", "Хабр", "Лента.ру" are unambiguous.)
UPDATE info_feeds
   SET lang = 'ru'
 WHERE lang IS DISTINCT FROM 'ru'
   AND title ~ '[А-Яа-яЁё]';

-- Rule 2: known-Russian outlets on non-.ru TLDs
UPDATE info_feeds
   SET lang = 'ru'
 WHERE lang IS DISTINCT FROM 'ru'
   AND (
     feed_url ~* 'russian\.rt\.com'
     OR feed_url ~* 'novayagazeta\.eu'
     OR feed_url ~* 'habr\.com/ru'
     OR feed_url ~* 'meduza\.io'
     OR feed_url ~* 'zona\.media'
   );

-- Diagnostics
DO $$
DECLARE
  count_ru INTEGER;
  count_en INTEGER;
  count_pl INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_ru FROM info_feeds WHERE lang = 'ru';
  SELECT COUNT(*) INTO count_en FROM info_feeds WHERE lang = 'en';
  SELECT COUNT(*) INTO count_pl FROM info_feeds WHERE lang = 'pl';
  RAISE NOTICE 'info_feeds lang distribution: ru=%, en=%, pl=%', count_ru, count_en, count_pl;
END $$;
