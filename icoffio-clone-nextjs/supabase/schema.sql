/**
 * SUPABASE DATABASE SCHEMA
 * 
 * Система логирования и статистики для Telegram Bot
 * 
 * Таблицы:
 * 1. user_preferences - настройки пользователей (язык, имя, etc)
 * 2. usage_logs - логи всех запросов
 * 3. published_articles - опубликованные статьи
 */

-- ============================================
-- 1. USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  chat_id BIGINT PRIMARY KEY,
  language VARCHAR(2) DEFAULT 'ru' CHECK (language IN ('ru', 'pl', 'en')),
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_last_active ON user_preferences(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_language ON user_preferences(language);

-- ============================================
-- 2. USAGE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- 'text-generate', 'url-parse', 'command'
  command VARCHAR(100), -- /start, /help, /queue, etc
  request_data JSONB, -- {url, text, category, etc}
  status VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
  error_message TEXT,
  processing_time INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (chat_id) REFERENCES user_preferences(chat_id) ON DELETE CASCADE
);

-- Индексы для статистики
CREATE INDEX IF NOT EXISTS idx_usage_chat_id ON usage_logs(chat_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_usage_status ON usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at DESC);

-- ============================================
-- 3. TELEGRAM JOBS (Queue Storage)
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'text-generate', 'url-parse'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  data JSONB NOT NULL, -- Job data (text, url, chatId, etc)
  result JSONB, -- Job result
  error TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_jobs_status ON telegram_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON telegram_jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON telegram_jobs(created_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_telegram_jobs_updated_at BEFORE UPDATE
    ON telegram_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. PUBLISHED ARTICLES
-- ============================================
CREATE TABLE IF NOT EXISTS published_articles (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  job_id VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  url_en TEXT,
  url_pl TEXT,
  post_id_en INTEGER,
  post_id_pl INTEGER,
  category VARCHAR(100),
  word_count INTEGER,
  languages TEXT[], -- ['en', 'pl']
  processing_time INTEGER, -- seconds
  source VARCHAR(50), -- 'text-generate' or 'url-parse'
  original_input TEXT, -- original URL or text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (chat_id) REFERENCES user_preferences(chat_id) ON DELETE CASCADE
);

-- Индексы для поиска и статистики
CREATE INDEX IF NOT EXISTS idx_articles_chat_id ON published_articles(chat_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON published_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created ON published_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON published_articles(source);

-- ============================================
-- VIEWS для статистики
-- ============================================

-- User Statistics (статистика по пользователям)
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  up.chat_id,
  up.username,
  up.first_name,
  up.language,
  up.created_at,
  up.last_active,
  COUNT(DISTINCT ul.id) as total_requests,
  COUNT(DISTINCT CASE WHEN ul.status = 'success' THEN ul.id END) as successful_requests,
  COUNT(DISTINCT pa.id) as published_articles,
  COALESCE(SUM(pa.word_count), 0) as total_words_published
FROM user_preferences up
LEFT JOIN usage_logs ul ON up.chat_id = ul.chat_id
LEFT JOIN published_articles pa ON up.chat_id = pa.chat_id
GROUP BY up.chat_id, up.username, up.first_name, up.language, up.created_at, up.last_active;

-- Global Statistics (общая статистика)
CREATE OR REPLACE VIEW global_statistics AS
SELECT 
  COUNT(DISTINCT chat_id) as total_users,
  COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL '24 hours' THEN chat_id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN chat_id END) as active_users_7d,
  (SELECT COUNT(*) FROM usage_logs) as total_requests,
  (SELECT COUNT(*) FROM usage_logs WHERE status = 'success') as successful_requests,
  (SELECT COUNT(*) FROM published_articles) as total_articles,
  (SELECT COALESCE(SUM(word_count), 0) FROM published_articles) as total_words_published,
  (SELECT COUNT(*) FROM published_articles WHERE created_at > NOW() - INTERVAL '24 hours') as articles_today
FROM user_preferences;

-- Category Statistics (статистика по категориям)
CREATE OR REPLACE VIEW category_statistics AS
SELECT 
  category,
  COUNT(*) as article_count,
  AVG(word_count) as avg_word_count,
  AVG(processing_time) as avg_processing_time
FROM published_articles
WHERE category IS NOT NULL
GROUP BY category
ORDER BY article_count DESC;

-- ============================================
-- ROW LEVEL SECURITY (опционально)
-- ============================================

-- Включить RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_articles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои данные
-- (для будущего, если понадобится user-facing dashboard)

-- Admin role может видеть все (для internal dashboard)
CREATE POLICY admin_all ON user_preferences FOR ALL USING (true);
CREATE POLICY admin_all ON usage_logs FOR ALL USING (true);
CREATE POLICY admin_all ON telegram_jobs FOR ALL USING (true);
CREATE POLICY admin_all ON published_articles FOR ALL USING (true);

-- ============================================
-- КОММЕНТАРИИ
-- ============================================

COMMENT ON TABLE user_preferences IS 'Настройки и профили пользователей Telegram бота';
COMMENT ON TABLE usage_logs IS 'Логи всех запросов к боту (commands, text, URL)';
COMMENT ON TABLE telegram_jobs IS 'Очередь заданий для персистентного хранения (Queue Storage)';
COMMENT ON TABLE published_articles IS 'Опубликованные статьи с метаданными';
COMMENT ON VIEW user_statistics IS 'Статистика по каждому пользователю';
COMMENT ON VIEW global_statistics IS 'Глобальная статистика бота';
COMMENT ON VIEW category_statistics IS 'Статистика по категориям статей';







