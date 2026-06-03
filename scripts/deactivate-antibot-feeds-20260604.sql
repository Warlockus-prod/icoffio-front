-- v10.20.5: deactivate feeds protected by anti-bot walls (Cloudflare 403 / IIS 449).
-- Probed 2026-06-04: direct URLs return 403/449 to any non-JS client; the self-hosted
-- RSSHub has no working route for them (503). Not fetchable without a paid JS-rendering
-- proxy — they only showed as empty columns. Deactivate to keep the section clean.
-- Reversible (set is_active = true) if a working source is found later.

UPDATE info_feeds SET is_active = false WHERE id IN (
  30,   -- Kotaku            (Cloudflare 403)
  41,   -- Papers with Code  (no items extracted; 403-class)
  71,   -- Indie Hackers     (anti-bot)
  77,   -- Designmodo        (anti-bot)
  136,  -- WirtualneMedia    (IIS 449)
  139   -- WirtualneMedia    (IIS 449, dup of 136)
);

SELECT id, left(title, 20) AS title, is_active
  FROM info_feeds WHERE id IN (30, 41, 71, 77, 136, 139) ORDER BY id;
