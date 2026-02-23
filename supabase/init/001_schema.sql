-- ============================================
-- ICOFFIO DATABASE SCHEMA (combined init)
-- v10.0.0 — Self-hosted PostgreSQL
-- ============================================

-- ============================
-- 1. published_articles
-- ============================
CREATE TABLE IF NOT EXISTS published_articles (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL DEFAULT 0,
  job_id VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  url_en TEXT,
  url_pl TEXT,
  post_id_en INTEGER,
  post_id_pl INTEGER,
  category VARCHAR(100),
  word_count INTEGER,
  languages TEXT[] DEFAULT '{}',
  processing_time INTEGER,
  source VARCHAR(50),
  original_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- v7.14.0 content storage columns
  slug_en TEXT,
  slug_pl TEXT,
  content_en TEXT,
  content_pl TEXT,
  excerpt_en TEXT,
  excerpt_pl TEXT,
  image_url TEXT,
  author TEXT DEFAULT 'icoffio Bot',
  tags TEXT[] DEFAULT '{}',
  meta_description TEXT,
  published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  -- v8.7.27 source URL
  source_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_chat_id ON published_articles(chat_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON published_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created ON published_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON published_articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_slug_en ON published_articles(slug_en);
CREATE INDEX IF NOT EXISTS idx_articles_slug_pl ON published_articles(slug_pl);
CREATE INDEX IF NOT EXISTS idx_articles_published ON published_articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON published_articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_category_published ON published_articles(category, published);
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON published_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_content_search ON published_articles USING gin(to_tsvector('english', coalesce(content_en, '')));

-- ============================
-- 2. telegram_jobs (queue)
-- ============================
CREATE TABLE IF NOT EXISTS telegram_jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  data JSONB NOT NULL,
  result JSONB,
  error TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON telegram_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON telegram_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON telegram_jobs(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_telegram_jobs_updated_at ON telegram_jobs;
CREATE TRIGGER update_telegram_jobs_updated_at BEFORE UPDATE
    ON telegram_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================
-- 3. telegram_user_preferences
-- ============================
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
  chat_id BIGINT PRIMARY KEY,
  style VARCHAR(20) DEFAULT 'analytical',
  language VARCHAR(10) DEFAULT 'ru',
  theme VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- v8.5.0 settings columns
  content_style VARCHAR(50) DEFAULT 'journalistic',
  images_count INTEGER DEFAULT 2 CHECK (images_count >= 0 AND images_count <= 3),
  images_source VARCHAR(20) DEFAULT 'unsplash',
  auto_publish BOOLEAN DEFAULT true,
  -- v10.0.0 multi-url
  combine_urls_as_single BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_preferences_style ON telegram_user_preferences(style);
CREATE INDEX IF NOT EXISTS idx_preferences_language ON telegram_user_preferences(language);

CREATE OR REPLACE FUNCTION update_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_telegram_preferences_updated_at ON telegram_user_preferences;
CREATE TRIGGER update_telegram_preferences_updated_at BEFORE UPDATE
    ON telegram_user_preferences FOR EACH ROW EXECUTE FUNCTION update_preferences_updated_at();

-- ============================
-- 4. telegram_image_library
-- ============================
CREATE TABLE IF NOT EXISTS telegram_image_library (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  category VARCHAR(50),
  keywords TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_category ON telegram_image_library(category);
CREATE INDEX IF NOT EXISTS idx_image_keywords ON telegram_image_library USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_image_usage ON telegram_image_library(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_image_last_used ON telegram_image_library(last_used_at DESC);

CREATE OR REPLACE FUNCTION update_image_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_telegram_image_library_updated_at ON telegram_image_library;
CREATE TRIGGER update_telegram_image_library_updated_at BEFORE UPDATE
    ON telegram_image_library FOR EACH ROW EXECUTE FUNCTION update_image_library_updated_at();

-- ============================
-- 5. article_views (analytics)
-- ============================
CREATE TABLE IF NOT EXISTS article_views (
  id SERIAL PRIMARY KEY,
  article_slug TEXT NOT NULL,
  user_ip VARCHAR(45),
  referrer TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_views_slug ON article_views(article_slug);
CREATE INDEX IF NOT EXISTS idx_article_views_viewed ON article_views(viewed_at DESC);

-- ============================
-- 6. article_popularity (materialized view)
-- ============================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_popularity_slug ON article_popularity(article_slug);
CREATE INDEX IF NOT EXISTS idx_popularity_score ON article_popularity(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popularity_views ON article_popularity(total_views DESC);

CREATE OR REPLACE FUNCTION refresh_article_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY article_popularity;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- 7. telegram_submissions
-- ============================
CREATE TABLE IF NOT EXISTS telegram_submissions (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  username VARCHAR(255),
  url TEXT,
  text_content TEXT,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'published', 'failed')),
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_chat_id ON telegram_submissions(chat_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON telegram_submissions(status);

-- ============================
-- 8. activity_logs
-- ============================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_source VARCHAR(50) NOT NULL,
  telegram_username VARCHAR(255),
  telegram_chat_id BIGINT,
  action VARCHAR(100) NOT NULL,
  action_label VARCHAR(255),
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  entity_title VARCHAR(500),
  entity_url TEXT,
  entity_url_pl TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_name ON activity_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_activity_user_source ON activity_logs(user_source);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity_type ON activity_logs(entity_type);

CREATE OR REPLACE VIEW recent_activity AS
SELECT
  id, user_name, user_source, telegram_username,
  action, action_label, entity_type, entity_title, entity_url, created_at,
  CASE
    WHEN user_source = 'telegram' THEN COALESCE('@' || telegram_username, 'Telegram')
    WHEN user_source = 'admin' THEN user_name
    WHEN user_source = 'api' THEN 'API'
    ELSE 'System'
  END as display_user
FROM activity_logs
ORDER BY created_at DESC
LIMIT 100;

CREATE OR REPLACE FUNCTION log_activity(
  p_user_name VARCHAR(255),
  p_user_source VARCHAR(50),
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id VARCHAR(255) DEFAULT NULL,
  p_entity_title VARCHAR(500) DEFAULT NULL,
  p_entity_url TEXT DEFAULT NULL,
  p_telegram_username VARCHAR(255) DEFAULT NULL,
  p_telegram_chat_id BIGINT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  new_id INTEGER;
  action_labels JSONB := '{
    "publish": "Published article",
    "edit": "Edited article",
    "delete": "Deleted article",
    "parse": "Parsed URL",
    "login": "Logged in",
    "logout": "Logged out",
    "upload_image": "Uploaded image",
    "generate_image": "Generated AI image"
  }'::JSONB;
BEGIN
  INSERT INTO activity_logs (
    user_name, user_source, telegram_username, telegram_chat_id,
    action, action_label, entity_type, entity_id, entity_title, entity_url, metadata
  ) VALUES (
    p_user_name, p_user_source, p_telegram_username, p_telegram_chat_id,
    p_action, COALESCE(action_labels->>p_action, p_action),
    p_entity_type, p_entity_id, p_entity_title, p_entity_url, p_metadata
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- 9. telegram_webhook_updates (idempotency)
-- ============================
CREATE TABLE IF NOT EXISTS telegram_webhook_updates (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT,
  user_id BIGINT,
  update_type VARCHAR(32),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_chat_id ON telegram_webhook_updates(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_received_at ON telegram_webhook_updates(received_at DESC);

-- ============================
-- 10. admin_user_roles
-- ============================
CREATE TABLE IF NOT EXISTS admin_user_roles (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_active ON admin_user_roles(is_active);

-- Insert owner accounts
INSERT INTO admin_user_roles (email, role, is_active, invited_by)
VALUES
  ('ag@voxexchange.io', 'admin', TRUE, 'owner-policy-2026'),
  ('andrzej.goleta@hybrid.ai', 'admin', TRUE, 'owner-policy-2026')
ON CONFLICT (email) DO UPDATE
SET role = 'admin', is_active = TRUE, updated_at = NOW();

-- Protect owner accounts from deletion/modification
CREATE OR REPLACE FUNCTION protect_owner_accounts_admin_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND lower(OLD.email) IN ('ag@voxexchange.io', 'andrzej.goleta@hybrid.ai') THEN
    RAISE EXCEPTION 'Owner account % cannot be deleted', OLD.email;
  END IF;
  IF TG_OP = 'UPDATE' AND lower(OLD.email) IN ('ag@voxexchange.io', 'andrzej.goleta@hybrid.ai') THEN
    IF lower(COALESCE(NEW.email, '')) <> lower(OLD.email) THEN
      RAISE EXCEPTION 'Owner email % cannot be changed', OLD.email;
    END IF;
    IF COALESCE(NEW.role, '') <> 'admin' THEN
      RAISE EXCEPTION 'Owner account % must keep role=admin', OLD.email;
    END IF;
    IF COALESCE(NEW.is_active, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Owner account % must stay active', OLD.email;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_owner_accounts_update ON admin_user_roles;
CREATE TRIGGER trg_protect_owner_accounts_update
BEFORE UPDATE ON admin_user_roles
FOR EACH ROW EXECUTE FUNCTION protect_owner_accounts_admin_user_roles();

DROP TRIGGER IF EXISTS trg_protect_owner_accounts_delete ON admin_user_roles;
CREATE TRIGGER trg_protect_owner_accounts_delete
BEFORE DELETE ON admin_user_roles
FOR EACH ROW EXECUTE FUNCTION protect_owner_accounts_admin_user_roles();

-- ============================
-- 11. banned_users
-- ============================
CREATE TABLE IF NOT EXISTS banned_users (
  username TEXT PRIMARY KEY,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by TEXT,
  reason TEXT
);

-- ============================
-- 12. user_preferences (legacy)
-- ============================
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE,
  chat_id BIGINT UNIQUE,
  language VARCHAR(10) DEFAULT 'ru',
  style VARCHAR(50) DEFAULT 'analytical',
  theme VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================
-- 13. Views & Functions
-- ============================

-- Slug generator
CREATE OR REPLACE FUNCTION generate_slug(title TEXT, language TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug, 1, 100);
  IF language = 'pl' THEN
    base_slug := base_slug || '-pl';
  ELSIF language = 'en' THEN
    base_slug := base_slug || '-en';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM published_articles
    WHERE slug_en = final_slug OR slug_pl = final_slug
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Full articles view
CREATE OR REPLACE VIEW articles_full AS
SELECT
  id, chat_id, job_id, title, slug_en, slug_pl,
  content_en, content_pl, excerpt_en, excerpt_pl,
  image_url, category, author, tags, word_count,
  languages, processing_time, source, original_input,
  meta_description, published, featured, created_at,
  url_en, url_pl, post_id_en, post_id_pl
FROM published_articles
WHERE published = true
ORDER BY created_at DESC;

-- Articles by language view
CREATE OR REPLACE VIEW articles_by_language AS
SELECT id, 'en' as language, slug_en as slug, title,
  content_en as content, excerpt_en as excerpt,
  image_url, category, author, tags, word_count,
  created_at, published, featured
FROM published_articles
WHERE content_en IS NOT NULL AND published = true
UNION ALL
SELECT id, 'pl' as language, slug_pl as slug, title,
  content_pl as content, excerpt_pl as excerpt,
  image_url, category, author, tags, word_count,
  created_at, published, featured
FROM published_articles
WHERE content_pl IS NOT NULL AND published = true;

-- Popular articles function
CREATE OR REPLACE FUNCTION get_popular_articles(lang TEXT, article_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  view_count BIGINT
) AS $$
BEGIN
  IF lang = 'en' THEN
    RETURN QUERY
    SELECT pa.id, pa.slug_en::text as slug, pa.title::text, pa.excerpt_en::text as excerpt,
      pa.image_url::text, pa.category::text, pa.created_at,
      COALESCE(av.view_count, 0::bigint) as view_count
    FROM published_articles pa
    LEFT JOIN (
      SELECT article_slug, COUNT(*)::bigint as view_count
      FROM article_views WHERE article_slug LIKE '%-en'
      GROUP BY article_slug
    ) av ON pa.slug_en = av.article_slug
    WHERE pa.published = true AND pa.content_en IS NOT NULL
    ORDER BY view_count DESC, pa.created_at DESC
    LIMIT article_limit;
  ELSIF lang = 'pl' THEN
    RETURN QUERY
    SELECT pa.id, pa.slug_pl::text as slug, pa.title::text, pa.excerpt_pl::text as excerpt,
      pa.image_url::text, pa.category::text, pa.created_at,
      COALESCE(av.view_count, 0::bigint) as view_count
    FROM published_articles pa
    LEFT JOIN (
      SELECT article_slug, COUNT(*)::bigint as view_count
      FROM article_views WHERE article_slug LIKE '%-pl'
      GROUP BY article_slug
    ) av ON pa.slug_pl = av.article_slug
    WHERE pa.published = true AND pa.content_pl IS NOT NULL
    ORDER BY view_count DESC, pa.created_at DESC
    LIMIT article_limit;
  ELSE
    RETURN QUERY
    SELECT pa.id, COALESCE(pa.slug_en, pa.slug_pl)::text as slug, pa.title::text,
      COALESCE(pa.excerpt_en, pa.excerpt_pl)::text as excerpt,
      pa.image_url::text, pa.category::text, pa.created_at, 0::BIGINT as view_count
    FROM published_articles pa
    WHERE pa.published = true
    ORDER BY pa.created_at DESC
    LIMIT article_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Related articles function
CREATE OR REPLACE FUNCTION get_related_articles(
  article_slug TEXT, lang TEXT, article_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  id INTEGER, slug TEXT, title TEXT, excerpt TEXT,
  image_url TEXT, category TEXT, created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  article_category TEXT;
BEGIN
  SELECT pa.category::text INTO article_category
  FROM published_articles pa
  WHERE pa.slug_en = article_slug OR pa.slug_pl = article_slug
  LIMIT 1;

  IF lang = 'en' THEN
    RETURN QUERY
    SELECT pa.id, pa.slug_en::text as slug, pa.title::text, pa.excerpt_en::text as excerpt,
      pa.image_url::text, pa.category::text, pa.created_at
    FROM published_articles pa
    WHERE pa.category::text = article_category AND pa.slug_en != article_slug
      AND pa.published = true AND pa.content_en IS NOT NULL
    ORDER BY pa.created_at DESC LIMIT article_limit;
  ELSIF lang = 'pl' THEN
    RETURN QUERY
    SELECT pa.id, pa.slug_pl::text as slug, pa.title::text, pa.excerpt_pl::text as excerpt,
      pa.image_url::text, pa.category::text, pa.created_at
    FROM published_articles pa
    WHERE pa.category::text = article_category AND pa.slug_pl != article_slug
      AND pa.published = true AND pa.content_pl IS NOT NULL
    ORDER BY pa.created_at DESC LIMIT article_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- DONE
-- ============================
SELECT 'icoffio schema initialized successfully' as status;
