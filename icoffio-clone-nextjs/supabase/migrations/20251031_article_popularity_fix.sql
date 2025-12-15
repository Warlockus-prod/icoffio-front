-- ============================================
-- ARTICLE POPULARITY MATERIALIZED VIEW FIX
-- Migration v7.13.0 - Fix Supabase Analytics error
-- Date: 2025-10-31
-- ============================================

-- Create materialized view if not exists
CREATE MATERIALIZED VIEW IF NOT EXISTS article_popularity AS
SELECT 
  article_slug,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_ip) as unique_views,
  MAX(viewed_at) as last_viewed,
  (COUNT(*) * 0.7 + 
   EXTRACT(EPOCH FROM (NOW() - MAX(viewed_at))) / 86400 * -0.3) as popularity_score
FROM article_views
GROUP BY article_slug
ORDER BY popularity_score DESC;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_popularity_slug ON article_popularity(article_slug);
CREATE INDEX IF NOT EXISTS idx_popularity_score ON article_popularity(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popularity_views ON article_popularity(total_views DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_article_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY article_popularity;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON MATERIALIZED VIEW article_popularity IS 'Popular articles based on views and recency v7.13.0';
COMMENT ON FUNCTION refresh_article_popularity() IS 'Refresh article popularity materialized view';

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Обновить view вручную:
-- SELECT refresh_article_popularity();

-- Посмотреть топ популярных статей:
-- SELECT article_slug, total_views, unique_views, popularity_score, last_viewed
-- FROM article_popularity
-- ORDER BY popularity_score DESC
-- LIMIT 10;

-- ============================================
-- ВАЖНО: Автоматическое обновление
-- ============================================
-- Для автоматического обновления каждые 15 минут нужна расширение pg_cron
-- Если расширение установлено, раскомментируйте:

-- SELECT cron.schedule(
--   'refresh-article-popularity',
--   '*/15 * * * *', -- Every 15 minutes
--   'SELECT refresh_article_popularity()'
-- );

-- Проверить что view создан:
-- SELECT COUNT(*) FROM article_popularity;

