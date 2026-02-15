/**
 * TELEGRAM SETTINGS LOADER v8.5.0
 * 
 * Загружает настройки пользователя из БД
 */

import { createClient } from '@supabase/supabase-js';
import type { InterfaceLanguage, TelegramSettings } from './types';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[SettingsLoader] Supabase not configured, using defaults');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

function normalizeInterfaceLanguage(raw?: string | null): InterfaceLanguage {
  if (!raw) return 'ru';
  const value = raw.toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('pl')) return 'pl';
  if (value.startsWith('ru')) return 'ru';
  return 'ru';
}

/**
 * Load settings for specific chat_id
 */
export async function loadTelegramSettings(
  chatId: number,
  fallbackLanguageCode?: string
): Promise<TelegramSettings> {
  console.log(`[SettingsLoader] Loading settings for chat ${chatId}...`);

  const supabase = getSupabase();
  const fallbackLanguage = normalizeInterfaceLanguage(fallbackLanguageCode);
  
  // Default settings (fallback)
  const defaultSettings: TelegramSettings = {
    chatId,
    contentStyle: 'journalistic',
    imagesCount: 2,
    imagesSource: 'unsplash',
    autoPublish: true,
    interfaceLanguage: fallbackLanguage,
    combineUrlsAsSingle: false,
  };

  if (!supabase) {
    console.log('[SettingsLoader] Using default settings');
    return defaultSettings;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('telegram_user_preferences')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 = no rows found (normal for new user)
      console.error('[SettingsLoader] Error loading user settings:', userError);
      return defaultSettings;
    }

    let resolvedSettings = userData;

    // Fallback to global admin defaults (chat_id=0)
    if (!resolvedSettings) {
      const { data: globalData, error: globalError } = await supabase
        .from('telegram_user_preferences')
        .select('*')
        .eq('chat_id', 0)
        .single();

      if (globalError && globalError.code !== 'PGRST116') {
        console.error('[SettingsLoader] Error loading global settings:', globalError);
      }

      if (globalData) {
        console.log('[SettingsLoader] Using global settings from chat_id=0');
        resolvedSettings = globalData;
      }
    }

    const settings: TelegramSettings = {
      chatId,
      contentStyle: resolvedSettings?.content_style || defaultSettings.contentStyle,
      imagesCount: resolvedSettings?.images_count ?? defaultSettings.imagesCount,
      imagesSource: resolvedSettings?.images_source || defaultSettings.imagesSource,
      autoPublish: resolvedSettings?.auto_publish ?? defaultSettings.autoPublish,
      interfaceLanguage: normalizeInterfaceLanguage(
        resolvedSettings?.language || defaultSettings.interfaceLanguage
      ),
      combineUrlsAsSingle:
        resolvedSettings?.combine_urls_as_single ?? defaultSettings.combineUrlsAsSingle,
    };

    console.log('[SettingsLoader] ✅ Loaded settings:', settings);
    return settings;

  } catch (error) {
    console.error('[SettingsLoader] Exception:', error);
    return defaultSettings;
  }
}
