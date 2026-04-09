-- Market Watch: competitor & industry monitoring
-- Migration: 20260407

-- Topics to watch (companies, trends, industries)
CREATE TABLE IF NOT EXISTS info_watch_topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  topic_type VARCHAR(50) NOT NULL DEFAULT 'trend',  -- 'competitor', 'trend', 'industry'
  search_langs TEXT[] NOT NULL DEFAULT '{en}',       -- ['en'], ['ru'], ['en','ru']
  is_active BOOLEAN NOT NULL DEFAULT true,
  extra_sources TEXT[] NOT NULL DEFAULT '{}',            -- RSS URLs or website URLs to scrape
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collected news articles from Google News RSS + other sources
CREATE TABLE IF NOT EXISTS info_watch_items (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES info_watch_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT,
  description TEXT,
  language VARCHAR(10),
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, url)
);

CREATE INDEX IF NOT EXISTS idx_watch_items_topic ON info_watch_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_watch_items_published ON info_watch_items(published_at DESC);

-- AI-generated reports
CREATE TABLE IF NOT EXISTS info_watch_reports (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES info_watch_topics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model VARCHAR(100),
  sources_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_reports_topic ON info_watch_reports(topic_id, created_at DESC);

-- v2: analysis columns
ALTER TABLE info_watch_items ADD COLUMN IF NOT EXISTS sentiment VARCHAR(10);
ALTER TABLE info_watch_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE info_watch_items ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE info_watch_topics ADD COLUMN IF NOT EXISTS quality_score REAL DEFAULT 0;
ALTER TABLE info_watch_topics ADD COLUMN IF NOT EXISTS report_days INTEGER DEFAULT 30;
CREATE INDEX IF NOT EXISTS idx_watch_items_title_search ON info_watch_items USING gin(to_tsvector('english', title));
