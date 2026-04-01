-- ============================================
-- INFO PORTAL SCHEMA
-- Feed aggregator (infomate-style)
-- ============================================

-- 1. Boards (categories like "News", "Tech", "Games")
CREATE TABLE IF NOT EXISTS info_boards (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(500),
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Blocks (sections within a board, e.g. "Russia", "USA", "Europe")
CREATE TABLE IF NOT EXISTS info_blocks (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES info_boards(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  layout VARCHAR(20) DEFAULT 'full', -- 'full' or 'half'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_info_blocks_board ON info_blocks(board_id);

-- 3. Feeds (RSS sources or Telegram channels)
CREATE TABLE IF NOT EXISTS info_feeds (
  id SERIAL PRIMARY KEY,
  block_id INTEGER NOT NULL REFERENCES info_blocks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  feed_url TEXT, -- RSS/Atom URL (null for Telegram)
  site_url TEXT, -- Website URL for link
  telegram_channel VARCHAR(200), -- @channel or t.me/channel
  feed_type VARCHAR(20) DEFAULT 'rss', -- 'rss', 'atom', 'telegram'
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_info_feeds_block ON info_feeds(block_id);

-- 4. Feed items (cached articles/posts)
CREATE TABLE IF NOT EXISTS info_feed_items (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES info_feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  guid TEXT, -- unique identifier from feed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feed_id, guid)
);

CREATE INDEX IF NOT EXISTS idx_info_feed_items_feed ON info_feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_info_feed_items_published ON info_feed_items(published_at DESC);

-- Insert sample boards
INSERT INTO info_boards (slug, title, subtitle, sort_order) VALUES
  ('news', 'Новости', 'События в мире', 1),
  ('tech', 'Технологии', 'IT и технологии', 2),
  ('crypto', 'Крипто', 'Криптовалюты и блокчейн', 3),
  ('games', 'Игры', 'Игровая индустрия', 4)
ON CONFLICT (slug) DO NOTHING;
