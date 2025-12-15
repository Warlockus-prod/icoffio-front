-- ============================================
-- TELEGRAM USER PREFERENCES TABLE
-- Migration v7.13.0 - User preferences for Telegram bot
-- Date: 2025-10-31
-- ============================================

-- Создать таблицу для хранения пользовательских настроек
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
  chat_id BIGINT PRIMARY KEY,
  style VARCHAR(20) DEFAULT 'analytical' CHECK (style IN ('news', 'analytical', 'tutorial', 'opinion')),
  language VARCHAR(10) DEFAULT 'ru' CHECK (language IN ('ru', 'pl', 'en')),
  theme VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_preferences_style ON telegram_user_preferences(style);
CREATE INDEX IF NOT EXISTS idx_preferences_language ON telegram_user_preferences(language);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_telegram_preferences_updated_at BEFORE UPDATE
    ON telegram_user_preferences FOR EACH ROW EXECUTE FUNCTION update_preferences_updated_at();

-- Row Level Security
ALTER TABLE telegram_user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON telegram_user_preferences FOR ALL USING (true);

-- Комментарий
COMMENT ON TABLE telegram_user_preferences IS 'Настройки пользователей Telegram бота (стиль публикации, язык) v7.13.0';

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Посмотреть все настройки
-- SELECT * FROM telegram_user_preferences ORDER BY updated_at DESC;

-- Статистика по стилям
-- SELECT style, COUNT(*) as count FROM telegram_user_preferences GROUP BY style;

-- Статистика по языкам
-- SELECT language, COUNT(*) as count FROM telegram_user_preferences GROUP BY language;

