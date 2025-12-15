/**
 * TELEGRAM SETTINGS LOADER v8.5.0
 * 
 * Загружает настройки пользователя из БД
 */

import { createClient } from '@supabase/supabase-js';
import type { TelegramSettings } from './types';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[SettingsLoader] Supabase not configured, using defaults');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Load settings for specific chat_id
 */
export async function loadTelegramSettings(chatId: number): Promise<TelegramSettings> {
  console.log(`[SettingsLoader] Loading settings for chat ${chatId}...`);

  const supabase = getSupabase();
  
  // Default settings (fallback)
  const defaultSettings: TelegramSettings = {
    chatId,
    contentStyle: 'journalistic',
    imagesCount: 2,
    imagesSource: 'unsplash',
    autoPublish: true,
  };

  if (!supabase) {
    console.log('[SettingsLoader] Using default settings');
    return defaultSettings;
  }

  try {
    const { data, error } = await supabase
      .from('telegram_user_preferences')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (normal for new user)
      console.error('[SettingsLoader] Error:', error);
      return defaultSettings;
    }

    if (!data) {
      console.log('[SettingsLoader] No settings found, using defaults');
      return defaultSettings;
    }

    const settings: TelegramSettings = {
      chatId,
      contentStyle: data.content_style || defaultSettings.contentStyle,
      imagesCount: data.images_count ?? defaultSettings.imagesCount,
      imagesSource: data.images_source || defaultSettings.imagesSource,
      autoPublish: data.auto_publish ?? defaultSettings.autoPublish,
    };

    console.log('[SettingsLoader] ✅ Loaded settings:', settings);
    return settings;

  } catch (error) {
    console.error('[SettingsLoader] Exception:', error);
    return defaultSettings;
  }
}

