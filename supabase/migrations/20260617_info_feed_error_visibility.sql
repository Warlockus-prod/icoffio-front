-- v10.20.9: feed fetch error visibility.
-- Until now a feed that failed to fetch (HTTP error / timeout / 0 parseable items)
-- only logged to the container stdout, and last_fetched_at simply wasn't updated —
-- so there was no way to see WHICH feed is broken and WHY from the DB or admin UI.
-- These columns make failures queryable.

ALTER TABLE info_feeds ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
ALTER TABLE info_feeds ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE info_feeds ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;

-- Quick "what's broken" view for ops:
--   SELECT id, title, last_error, consecutive_failures, last_attempt_at
--   FROM info_feeds WHERE is_active AND consecutive_failures > 0 ORDER BY consecutive_failures DESC;
