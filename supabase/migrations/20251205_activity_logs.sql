-- ============================================
-- ACTIVITY LOGS
-- Migration v8.3.0 - User Activity Tracking
-- Date: 2025-12-05
-- ============================================

-- Таблица для логирования активности пользователей
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  
  -- Кто выполнил действие
  user_name VARCHAR(255) NOT NULL,        -- Имя пользователя (Admin Panel) или Telegram username
  user_source VARCHAR(50) NOT NULL,       -- 'admin' | 'telegram' | 'api' | 'system'
  telegram_username VARCHAR(255),         -- @username если из Telegram
  telegram_chat_id BIGINT,               -- Chat ID если из Telegram
  
  -- Что было сделано
  action VARCHAR(100) NOT NULL,           -- 'publish', 'edit', 'delete', 'parse', 'login', etc.
  action_label VARCHAR(255),              -- Человекочитаемое описание
  
  -- С чем было сделано
  entity_type VARCHAR(50),                -- 'article', 'image', 'settings', etc.
  entity_id VARCHAR(255),                 -- ID статьи или другой сущности
  entity_title VARCHAR(500),              -- Название статьи
  entity_url TEXT,                        -- Ссылка на статью (EN)
  entity_url_pl TEXT,                     -- Ссылка на статью (PL)
  
  -- Дополнительные данные
  metadata JSONB DEFAULT '{}',            -- Любые дополнительные данные
  ip_address VARCHAR(45),                 -- IP адрес (опционально)
  user_agent TEXT,                        -- User Agent (опционально)
  
  -- Время
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_activity_user_name ON activity_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_activity_user_source ON activity_logs(user_source);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity_type ON activity_logs(entity_type);

-- View для удобного просмотра последней активности
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  id,
  user_name,
  user_source,
  telegram_username,
  action,
  action_label,
  entity_type,
  entity_title,
  entity_url,
  created_at,
  CASE 
    WHEN user_source = 'telegram' THEN '📱 ' || COALESCE('@' || telegram_username, 'Telegram')
    WHEN user_source = 'admin' THEN '👤 ' || user_name
    WHEN user_source = 'api' THEN '🤖 API'
    ELSE '⚙️ System'
  END as display_user
FROM activity_logs
ORDER BY created_at DESC
LIMIT 100;

-- Функция для добавления записи активности
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
    user_name,
    user_source,
    telegram_username,
    telegram_chat_id,
    action,
    action_label,
    entity_type,
    entity_id,
    entity_title,
    entity_url,
    metadata
  ) VALUES (
    p_user_name,
    p_user_source,
    p_telegram_username,
    p_telegram_chat_id,
    p_action,
    COALESCE(action_labels->>p_action, p_action),
    p_entity_type,
    p_entity_id,
    p_entity_title,
    p_entity_url,
    p_metadata
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON TABLE activity_logs IS 'Логи активности пользователей (публикации, редактирования и т.д.) v8.3.0';
COMMENT ON VIEW recent_activity IS 'Последние 100 записей активности с форматированным отображением пользователя';
COMMENT ON FUNCTION log_activity IS 'Функция для добавления записи активности с автоматическим action_label';

