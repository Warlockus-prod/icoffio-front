-- ============================================
-- TELEGRAM SIMPLE WORKER + WEBHOOK IDEMPOTENCY
-- Date: 2026-02-15
-- ============================================

-- 1) Persistent idempotency for Telegram updates
CREATE TABLE IF NOT EXISTS telegram_webhook_updates (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT,
  user_id BIGINT,
  update_type VARCHAR(32),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_chat_id
  ON telegram_webhook_updates(chat_id);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_received_at
  ON telegram_webhook_updates(received_at DESC);

ALTER TABLE telegram_webhook_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_webhook_updates'
      AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY admin_all ON telegram_webhook_updates FOR ALL USING (true);
  END IF;
END $$;

COMMENT ON TABLE telegram_webhook_updates IS
  'Processed Telegram update_id values for persistent idempotency';

-- 2) User preference: default multi-url behavior
ALTER TABLE telegram_user_preferences
  ADD COLUMN IF NOT EXISTS combine_urls_as_single BOOLEAN DEFAULT false;

COMMENT ON COLUMN telegram_user_preferences.combine_urls_as_single IS
  'If true, multiple URLs in one message are merged into one combined article by default';

-- 3) Allow queued status in telegram_submissions (if the table exists)
DO $$
DECLARE
  status_constraint RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'telegram_submissions'
  ) THEN
    FOR status_constraint IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'telegram_submissions'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE telegram_submissions DROP CONSTRAINT IF EXISTS %I', status_constraint.conname);
    END LOOP;

    BEGIN
      ALTER TABLE telegram_submissions
        ADD CONSTRAINT telegram_submissions_status_check
        CHECK (status IN ('queued', 'processing', 'published', 'failed'));
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
