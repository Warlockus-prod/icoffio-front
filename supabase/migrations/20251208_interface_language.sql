/**
 * MIGRATION: Add interface_language to telegram_user_preferences
 * 
 * Version: v8.6.0
 * Date: 2025-12-08
 * 
 * Adds support for multilingual Telegram bot interface (RU/EN/PL)
 */

-- Add interface_language column
ALTER TABLE telegram_user_preferences
ADD COLUMN IF NOT EXISTS interface_language TEXT DEFAULT 'ru' CHECK (interface_language IN ('ru', 'en', 'pl'));

-- Add comment
COMMENT ON COLUMN telegram_user_preferences.interface_language IS 'Bot interface language: ru (Russian), en (English), pl (Polish)';

-- Update existing rows to have default language (ru)
UPDATE telegram_user_preferences
SET interface_language = 'ru'
WHERE interface_language IS NULL;

