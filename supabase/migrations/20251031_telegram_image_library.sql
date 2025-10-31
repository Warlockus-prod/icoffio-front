-- ============================================
-- TELEGRAM IMAGE LIBRARY TABLE
-- Migration v7.13.0 - Image reuse system for Telegram bot
-- Date: 2025-10-31
-- ============================================

-- Создать таблицу для хранения переиспользуемых изображений
CREATE TABLE IF NOT EXISTS telegram_image_library (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  category VARCHAR(50),
  keywords TEXT[], -- Array of keywords for search
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_image_category ON telegram_image_library(category);
CREATE INDEX IF NOT EXISTS idx_image_keywords ON telegram_image_library USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_image_usage ON telegram_image_library(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_image_last_used ON telegram_image_library(last_used_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_image_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_telegram_image_library_updated_at BEFORE UPDATE
    ON telegram_image_library FOR EACH ROW EXECUTE FUNCTION update_image_library_updated_at();

-- Row Level Security
ALTER TABLE telegram_image_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON telegram_image_library FOR ALL USING (true);

-- Комментарий
COMMENT ON TABLE telegram_image_library IS 'Библиотека переиспользуемых изображений для Telegram бота v7.13.0';
COMMENT ON COLUMN telegram_image_library.keywords IS 'Массив ключевых слов для поиска похожих изображений';
COMMENT ON COLUMN telegram_image_library.usage_count IS 'Количество использований изображения';

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Найти изображение по ключевым словам
-- SELECT * FROM telegram_image_library 
-- WHERE keywords && ARRAY['ai', 'technology', 'innovation']::TEXT[]
-- ORDER BY usage_count DESC, last_used_at DESC LIMIT 1;

-- Топ используемых изображений
-- SELECT id, prompt, category, usage_count, last_used_at 
-- FROM telegram_image_library 
-- ORDER BY usage_count DESC 
-- LIMIT 10;

-- Статистика по категориям
-- SELECT category, COUNT(*) as count, SUM(usage_count) as total_usage
-- FROM telegram_image_library 
-- GROUP BY category
-- ORDER BY total_usage DESC;

-- Неиспользуемые изображения (старше 30 дней)
-- SELECT * FROM telegram_image_library 
-- WHERE (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '30 days')
-- AND usage_count = 0
-- ORDER BY created_at DESC;

