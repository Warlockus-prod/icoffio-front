/**
 * TEMPORARY migration endpoint — DELETE after use.
 * Executes DDL via Supabase Management API.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MIGRATION_SQL = `
-- 1) telegram_webhook_updates table
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
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_webhook_updates'
      AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY admin_all ON telegram_webhook_updates FOR ALL USING (true);
  END IF;
END $$;

-- 2) combine_urls_as_single column
ALTER TABLE telegram_user_preferences
  ADD COLUMN IF NOT EXISTS combine_urls_as_single BOOLEAN DEFAULT false;

-- 3) Allow queued status
DO $$
DECLARE
  status_constraint RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telegram_submissions'
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
`;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Extract project ref from URL
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  // Supabase exposes a SQL execution endpoint for service role
  // via the pg-meta service at /pg/query
  const pgMetaUrl = `${supabaseUrl}/pg/query`;

  try {
    const res = await fetch(pgMetaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });

    if (!res.ok) {
      const body = await res.text();
      // If pg/query doesn't work, try the database REST endpoint
      return NextResponse.json({
        error: 'pg/query failed',
        status: res.status,
        body,
        fallback: 'Run the SQL manually in Supabase Dashboard > SQL Editor',
        sql: MIGRATION_SQL,
      });
    }

    const result = await res.json();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({
      error: String(err),
      fallback: 'Run the SQL manually in Supabase Dashboard > SQL Editor',
      sql: MIGRATION_SQL,
    });
  }
}
