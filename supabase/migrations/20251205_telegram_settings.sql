/**
 * TELEGRAM SETTINGS MIGRATION v8.5.0
 * 
 * Добавляет настройки для Telegram bot:
 * - content_style: стиль обработки контента
 * - images_count: количество изображений (0-3)
 * - images_source: источник изображений
 * - auto_publish: автоматическая публикация или draft
 */

-- Расширяем таблицу telegram_user_preferences
ALTER TABLE telegram_user_preferences 
  ADD COLUMN IF NOT EXISTS content_style VARCHAR(50) DEFAULT 'journalistic',
  ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 2 CHECK (images_count >= 0 AND images_count <= 3),
  ADD COLUMN IF NOT EXISTS images_source VARCHAR(20) DEFAULT 'unsplash',
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT true;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_telegram_prefs_chat_id ON telegram_user_preferences(chat_id);

-- Комментарии для документации
COMMENT ON COLUMN telegram_user_preferences.content_style IS 'Стиль обработки контента: journalistic, keep_as_is, seo_optimized, academic, casual, technical';
COMMENT ON COLUMN telegram_user_preferences.images_count IS 'Количество изображений для вставки в статью (0-3)';
COMMENT ON COLUMN telegram_user_preferences.images_source IS 'Источник изображений: unsplash, ai, none';
COMMENT ON COLUMN telegram_user_preferences.auto_publish IS 'Автоматически публиковать или сохранять как черновик';

