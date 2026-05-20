-- =============================================================
-- Migration: 20260520_info_board_polska
-- Creates an "all-Polish-content" board with the existing PL feeds attached.
--
-- Approach: COPY (not MOVE) the 3 existing PL feeds into a new block on the
-- 'polska' board. Keeping originals in their current blocks avoids breaking
-- any board the admin already curated. Side-effect: items won't double-up
-- because info_feed_items uses (feed_id, guid) — each row gets its own feed_id.
--
-- Idempotent.
-- =============================================================

-- 1. Create board if missing
INSERT INTO info_boards (slug, title, subtitle, sort_order, is_active)
VALUES ('polska', 'Polska', 'Polskie źródła wiadomości i analiz', 50, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create default block if board has no blocks yet
INSERT INTO info_blocks (board_id, title, layout, sort_order, is_active)
SELECT b.id, 'Media polskie', 'full', 10, true
  FROM info_boards b
 WHERE b.slug = 'polska'
   AND NOT EXISTS (SELECT 1 FROM info_blocks WHERE board_id = b.id);

-- 3. Copy existing PL feeds into the new block (skip if a feed with the same feed_url is already there).
INSERT INTO info_feeds (
  block_id, title, title_en, title_pl, lang,
  feed_url, site_url, telegram_channel, feed_type, icon_url, sort_order, is_active
)
SELECT
  bl.id, f.title, f.title_en, f.title_pl, 'pl',
  f.feed_url, f.site_url, f.telegram_channel, f.feed_type, f.icon_url,
  (ROW_NUMBER() OVER (ORDER BY f.id)) * 10, true
FROM info_feeds f
CROSS JOIN LATERAL (
  SELECT id FROM info_blocks
   WHERE board_id = (SELECT id FROM info_boards WHERE slug = 'polska')
   ORDER BY sort_order ASC LIMIT 1
) bl
WHERE f.lang = 'pl'
  AND NOT EXISTS (
    SELECT 1 FROM info_feeds existing
     WHERE existing.block_id = bl.id
       AND existing.feed_url = f.feed_url
  );

-- 4. Diagnostics
DO $$
DECLARE
  board_count INTEGER;
  block_count INTEGER;
  feed_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO board_count FROM info_boards WHERE slug = 'polska';
  SELECT COUNT(*) INTO block_count FROM info_blocks
    WHERE board_id = (SELECT id FROM info_boards WHERE slug = 'polska');
  SELECT COUNT(*) INTO feed_count FROM info_feeds
    WHERE block_id IN (
      SELECT id FROM info_blocks
       WHERE board_id = (SELECT id FROM info_boards WHERE slug = 'polska')
    );
  RAISE NOTICE 'polska board: % board, % blocks, % feeds', board_count, block_count, feed_count;
END $$;
