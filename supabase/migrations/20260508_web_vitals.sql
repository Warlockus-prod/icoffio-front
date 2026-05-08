-- =============================================================
-- Migration: 20260508_web_vitals
-- Capture Web Vitals (LCP, CLS, INP, FCP, TTFB, FID) from real users.
-- Populated by client beacon -> /api/analytics/web-vitals.
-- Aggregated for admin dashboard via SQL queries.
-- =============================================================

CREATE TABLE IF NOT EXISTS web_vitals (
  id           BIGSERIAL PRIMARY KEY,
  metric_name  VARCHAR(20) NOT NULL,                  -- LCP, CLS, INP, FCP, TTFB, FID
  metric_value DOUBLE PRECISION NOT NULL,             -- raw value (CLS already scaled by client)
  metric_id    VARCHAR(100),                          -- web-vitals lib metric id (one per page-load)
  rating       VARCHAR(20),                           -- 'good' | 'needs-improvement' | 'poor'
  page_path    VARCHAR(500),                          -- /en, /pl/article/foo, etc.
  user_agent   TEXT,
  viewport_w   INTEGER,
  viewport_h   INTEGER,
  connection   VARCHAR(20),                           -- '4g', '3g', 'slow-2g', etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_created ON web_vitals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_created ON web_vitals(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_path ON web_vitals(page_path);

COMMENT ON TABLE web_vitals IS
  'Real-User Web Vitals metrics. Auto-pruned after 30 days by retention policy.';
