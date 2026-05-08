-- =============================================================
-- Migration: 20260508_schema_consistency_fixes
-- Bundle of HIGH/MEDIUM-severity fixes from the May 2026 audit.
--
-- 1. user_preferences.last_active — code writes it (lib/telegram-database-service.ts:76,102)
--    but column was missing. ALTER ADD here.
-- 2. telegram_image_library.article_id — FK was missing → orphan rows possible.
-- 3. Missing updated_at triggers on tables that have the column but no auto-update.
-- 4. Composite indexes for hot-path queries (admin UI filters).
--
-- All operations are idempotent. Safe to re-run.
-- =============================================================

-- =============================================================
-- 1. user_preferences.last_active
-- =============================================================
-- Legacy table (telegram_user_preferences is the v8.x replacement),
-- but lib/telegram-database-service.ts still writes here via
-- /api/telegram/{stats,user-stats}. Until those legacy routes are removed
-- in Telegram Phase 1, the column must exist or INSERTs fail.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_preferences_last_active
  ON user_preferences(last_active DESC NULLS LAST);

COMMENT ON COLUMN user_preferences.last_active IS
  'Last user activity timestamp. Written by legacy telegram-database-service.ts; remove together with that file in Telegram Phase 1.';

-- =============================================================
-- 2. FK: telegram_image_library.article_id → published_articles(id)
-- =============================================================
-- Clean up any orphan article_id values first to avoid FK violation,
-- then add the constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.table_constraints
     WHERE constraint_name = 'fk_telegram_image_library_article_id'
       AND table_name = 'telegram_image_library'
  ) THEN
    -- Null out orphan refs so the FK can be added
    UPDATE telegram_image_library til
       SET article_id = NULL
     WHERE article_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM published_articles pa WHERE pa.id = til.article_id
       );

    ALTER TABLE telegram_image_library
      ADD CONSTRAINT fk_telegram_image_library_article_id
      FOREIGN KEY (article_id) REFERENCES published_articles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================
-- 3. Missing updated_at triggers
-- =============================================================
-- All tables below have `updated_at` columns but no BEFORE UPDATE trigger.
-- Use the shared update_updated_at_column() function from init/001_schema.sql:76.

-- 3a. telegram_submissions
DROP TRIGGER IF EXISTS update_telegram_submissions_updated_at ON telegram_submissions;
CREATE TRIGGER update_telegram_submissions_updated_at
  BEFORE UPDATE ON telegram_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3b. admin_user_roles
DROP TRIGGER IF EXISTS update_admin_user_roles_updated_at ON admin_user_roles;
CREATE TRIGGER update_admin_user_roles_updated_at
  BEFORE UPDATE ON admin_user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3c. info_boards (info portal — only if migration 20260401 applied)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_boards') THEN
    DROP TRIGGER IF EXISTS update_info_boards_updated_at ON info_boards;
    CREATE TRIGGER update_info_boards_updated_at
      BEFORE UPDATE ON info_boards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 3d. info_watch_topics (market watch — only if migration 20260407 applied)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_watch_topics') THEN
    DROP TRIGGER IF EXISTS update_info_watch_topics_updated_at ON info_watch_topics;
    CREATE TRIGGER update_info_watch_topics_updated_at
      BEFORE UPDATE ON info_watch_topics
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================
-- 4. Hot-path composite indexes
-- =============================================================

-- 4a. Admin queue filter: WHERE status = ? AND chat_id = ?
CREATE INDEX IF NOT EXISTS idx_submissions_status_chat
  ON telegram_submissions(status, chat_id);

-- 4b. Latest items per feed (info portal home rendering) — defensive
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_feed_items') THEN
    CREATE INDEX IF NOT EXISTS idx_info_feed_items_feed_published
      ON info_feed_items(feed_id, published_at DESC NULLS LAST);
  END IF;
END $$;

-- 4c. Watch items per topic, latest first — defensive
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'info_watch_items') THEN
    CREATE INDEX IF NOT EXISTS idx_info_watch_items_topic_published
      ON info_watch_items(topic_id, published_at DESC NULLS LAST);
  END IF;
END $$;
