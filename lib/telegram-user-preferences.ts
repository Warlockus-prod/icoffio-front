/**
 * TELEGRAM USER PREFERENCES
 * 
 * Manages user preferences for Telegram bot:
 * - Publication style (news, analytical, tutorial, opinion)
 * - Language preference
 * - Theme (future)
 * 
 * @version 7.13.0
 * @date 2025-10-31
 */

export type PublicationStyle = 'news' | 'analytical' | 'tutorial' | 'opinion';

export interface UserPreferences {
  chatId: number;
  style: PublicationStyle;
  language: string;
  theme?: string;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory storage (fallback if Supabase not available)
const preferencesMap = new Map<number, UserPreferences>();

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: Omit<UserPreferences, 'chatId'> = {
  style: 'analytical',
  language: 'ru',
  theme: undefined,
};

/**
 * Get user preferences (memory or Supabase)
 */
export async function getUserPreferences(chatId: number): Promise<UserPreferences> {
  // Try Supabase first
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('telegram_user_preferences')
        .select('*')
        .eq('chat_id', chatId)
        .single();

      if (!error && data) {
        console.log(`[Preferences] Loaded from Supabase for chat ${chatId}`);
        return data as UserPreferences;
      }
    }
  } catch (err) {
    console.warn('[Preferences] Supabase not available, using memory');
  }

  // Fallback to memory
  const memoryPrefs = preferencesMap.get(chatId);
  if (memoryPrefs) {
    return memoryPrefs;
  }

  // Return defaults if not found
  return {
    chatId,
    ...DEFAULT_PREFERENCES,
  };
}

/**
 * Set publication style
 */
export async function setPublicationStyle(chatId: number, style: PublicationStyle): Promise<void> {
  const prefs = await getUserPreferences(chatId);
  const updated: UserPreferences = {
    ...prefs,
    chatId,
    style,
    updatedAt: new Date().toISOString(),
  };

  // Try Supabase first
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('telegram_user_preferences')
        .upsert({
          chat_id: chatId,
          style,
          language: prefs.language,
          theme: prefs.theme || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id',
        });

      if (!error) {
        console.log(`[Preferences] Saved style to Supabase for chat ${chatId}: ${style}`);
        return;
      }
    }
  } catch (err) {
    console.warn('[Preferences] Supabase not available, using memory');
  }

  // Fallback to memory
  preferencesMap.set(chatId, updated);
  console.log(`[Preferences] Saved style to memory for chat ${chatId}: ${style}`);
}

/**
 * Get publication style
 */
export async function getPublicationStyle(chatId: number): Promise<PublicationStyle> {
  const prefs = await getUserPreferences(chatId);
  return prefs.style;
}

/**
 * Set language preference
 */
export async function setLanguage(chatId: number, language: string): Promise<void> {
  const prefs = await getUserPreferences(chatId);
  const updated: UserPreferences = {
    ...prefs,
    chatId,
    language,
    updatedAt: new Date().toISOString(),
  };

  // Try Supabase first
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('telegram_user_preferences')
        .upsert({
          chat_id: chatId,
          style: prefs.style,
          language,
          theme: prefs.theme || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id',
        });

      console.log(`[Preferences] Saved language to Supabase for chat ${chatId}: ${language}`);
      return;
    }
  } catch (err) {
    console.warn('[Preferences] Supabase not available, using memory');
  }

  // Fallback to memory
  preferencesMap.set(chatId, updated);
  console.log(`[Preferences] Saved language to memory for chat ${chatId}: ${language}`);
}

/**
 * Get all user preferences
 */
export async function getAllPreferences(chatId: number): Promise<UserPreferences> {
  return await getUserPreferences(chatId);
}

