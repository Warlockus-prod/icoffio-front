-- =============================================================
-- Migration: 20260520_info_blocks_boards_locale
-- Extends the per-locale-title pattern (introduced for info_feeds in v10.11.0)
-- to info_blocks and info_boards.
--
-- Why: in v10.12.0 we created board "Polska" with block "Media polskie" —
-- but on /en/info/polska that block still shows the Polish label. Same
-- pattern applies to any future locale-specific board.
--
-- Idempotent.
-- =============================================================

ALTER TABLE info_blocks
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_pl TEXT;

ALTER TABLE info_boards
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_pl TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_pl TEXT;

-- Backfill: copy current title/subtitle to both locale variants (fallback parity)
UPDATE info_blocks SET title_en = title WHERE title_en IS NULL OR title_en = '';
UPDATE info_blocks SET title_pl = title WHERE title_pl IS NULL OR title_pl = '';

UPDATE info_boards SET title_en = title WHERE title_en IS NULL OR title_en = '';
UPDATE info_boards SET title_pl = title WHERE title_pl IS NULL OR title_pl = '';
UPDATE info_boards SET subtitle_en = subtitle WHERE subtitle IS NOT NULL AND (subtitle_en IS NULL OR subtitle_en = '');
UPDATE info_boards SET subtitle_pl = subtitle WHERE subtitle IS NOT NULL AND (subtitle_pl IS NULL OR subtitle_pl = '');

COMMENT ON COLUMN info_blocks.title_en IS 'Localized title for English UI. Falls back to title.';
COMMENT ON COLUMN info_blocks.title_pl IS 'Localized title for Polish UI. Falls back to title.';
COMMENT ON COLUMN info_boards.title_en IS 'Localized title for English UI. Falls back to title.';
COMMENT ON COLUMN info_boards.title_pl IS 'Localized title for Polish UI. Falls back to title.';
COMMENT ON COLUMN info_boards.subtitle_en IS 'Localized subtitle for English UI. Falls back to subtitle.';
COMMENT ON COLUMN info_boards.subtitle_pl IS 'Localized subtitle for Polish UI. Falls back to subtitle.';
