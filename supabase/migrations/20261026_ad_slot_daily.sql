-- =============================================================
-- Migration: 20261026_ad_slot_daily
-- Site-side ad accounting: how often each VOX place came back filled or empty.
-- Populated by the client beacon -> /api/ads/telemetry (lib/ad-telemetry.ts),
-- read by the admin "Advertising" tab via /api/admin/ad-stats.
--
-- This counts auctions the SSP answered, as seen by the page. Billable
-- impressions and revenue stay in the VOX publisher panel — compare the two.
-- =============================================================

CREATE TABLE IF NOT EXISTS ad_slot_daily (
  day        DATE        NOT NULL,
  host       VARCHAR(100) NOT NULL,   -- icoffio.com, app.icoffio.com
  place_id   VARCHAR(40)  NOT NULL,   -- VOX PlaceID
  format     VARCHAR(20)  NOT NULL,   -- 970x250, 320x50, in-image …
  device     VARCHAR(10)  NOT NULL,   -- desktop | mobile
  filled     INTEGER      NOT NULL DEFAULT 0,
  empty      INTEGER      NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, host, place_id, device)
);

CREATE INDEX IF NOT EXISTS idx_ad_slot_daily_day ON ad_slot_daily(day DESC);

COMMENT ON TABLE ad_slot_daily IS
  'Per-day VOX auction outcomes per place/host/device, counted client-side. Revenue lives in the VOX panel.';
