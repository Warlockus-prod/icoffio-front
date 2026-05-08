-- =============================================================
-- Migration: 20260508_errors_log
-- Self-hosted error tracking (replaces Sentry).
-- Captured by lib/error-logger.ts; viewable via /api/admin/errors-log.
--
-- Idempotent.
-- =============================================================

CREATE TABLE IF NOT EXISTS errors_log (
  id            SERIAL PRIMARY KEY,
  level         VARCHAR(20) NOT NULL DEFAULT 'error'
                CHECK (level IN ('info', 'warn', 'error', 'critical')),
  source        VARCHAR(100) NOT NULL,
  message       TEXT NOT NULL,
  stack         TEXT,
  metadata      JSONB DEFAULT '{}',
  request_path  VARCHAR(500),
  request_method VARCHAR(10),
  user_email    VARCHAR(255),
  user_ip       VARCHAR(45),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_log_created ON errors_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_log_level ON errors_log(level);
CREATE INDEX IF NOT EXISTS idx_errors_log_source ON errors_log(source);
CREATE INDEX IF NOT EXISTS idx_errors_log_level_created ON errors_log(level, created_at DESC);

COMMENT ON TABLE errors_log IS
  'Application error log. Auto-pruned by retention policy (default: keep critical 90d, error 30d, warn 7d, info 24h).';
