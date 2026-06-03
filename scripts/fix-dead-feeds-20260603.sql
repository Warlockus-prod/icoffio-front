-- v10.20.3: replace dead feed URLs with working alternatives, deactivate the unfixable.
-- Probed 2026-06-03; see CHANGELOG. Idempotent (safe to re-run).

-- Working replacements (verified 200 + items):
UPDATE info_feeds SET feed_url = 'http://172.17.0.1:1200/apnews/topics/apf-topnews', feed_type = 'rss'
  WHERE id = 9;   -- AP News → local RSSHub (public rsshub.app was 403)
UPDATE info_feeds SET feed_url = 'https://news.google.com/rss/search?q=site:reuters.com+when:7d&hl=en-US&gl=US&ceid=US:en', feed_type = 'rss'
  WHERE id = 1;   -- Reuters → Google News (feeds.reuters.com DNS-dead)
UPDATE info_feeds SET feed_url = 'http://172.17.0.1:1200/anthropic/news', feed_type = 'rss'
  WHERE id = 40;  -- Anthropic → local RSSHub (anthropic.com/feed.xml 404)
UPDATE info_feeds SET feed_url = 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss', feed_type = 'rss'
  WHERE id = 88;  -- РБК → /news/30/ (was /news/20/ → 404)
UPDATE info_feeds SET feed_url = 'https://dtf.ru/rss/all', feed_type = 'rss'
  WHERE id = 101; -- DTF → /rss/all (was /rss/games → 404)

-- Genuinely dead, no working RSS found → deactivate (niche sources, low loss):
UPDATE info_feeds SET is_active = false WHERE id IN (112, 113, 131); -- Фонтанка, The Batch, Havas

SELECT id, left(title, 18) AS title, is_active, left(feed_url, 50) AS url
  FROM info_feeds WHERE id IN (1, 9, 40, 88, 101, 112, 113, 131) ORDER BY id;
