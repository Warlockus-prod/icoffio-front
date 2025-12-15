/**
 * TELEGRAM DATABASE SERVICE
 * 
 * Сервис для работы с Supabase:
 * - User tracking
 * - Usage logging  
 * - Article logging
 * - Statistics
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase-client';

export interface TelegramUser {
  chat_id: number;
  language?: 'ru' | 'pl' | 'en';
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
}

export interface UsageLog {
  chat_id: number;
  request_type: 'text-generate' | 'url-parse' | 'command';
  command?: string;
  request_data?: any;
  status?: 'success' | 'failed' | 'pending';
  error_message?: string;
  processing_time?: number;
}

export interface PublishedArticle {
  chat_id: number;
  job_id?: string;
  title: string;
  url_en?: string;
  url_pl?: string;
  post_id_en?: number;
  post_id_pl?: number;
  category?: string;
  word_count?: number;
  languages?: string[];
  processing_time?: number;
  source?: 'text-generate' | 'url-parse';
  original_input?: string;
}

class TelegramDatabaseService {
  private supabase = getSupabaseClient();

  /**
   * ==================================
   * USER TRACKING
   * ==================================
   */

  /**
   * Track or update user
   */
  async trackUser(user: TelegramUser): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.log('[DB] Supabase not configured, skipping user tracking');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('user_preferences')
        .upsert({
          chat_id: user.chat_id,
          language: user.language || 'ru',
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          is_bot: user.is_bot || false,
          last_active: new Date().toISOString()
        }, {
          onConflict: 'chat_id'
        });

      if (error) {
        console.error('[DB] Failed to track user:', error);
      } else {
        console.log(`[DB] User tracked: ${user.chat_id} (${user.first_name})`);
      }
    } catch (error) {
      console.error('[DB] Error tracking user:', error);
    }
  }

  /**
   * Update user language preference
   */
  async updateUserLanguage(chat_id: number, language: 'ru' | 'pl' | 'en'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await this.supabase
        .from('user_preferences')
        .update({ 
          language,
          last_active: new Date().toISOString()
        })
        .eq('chat_id', chat_id);

      if (error) {
        console.error('[DB] Failed to update language:', error);
      } else {
        console.log(`[DB] Language updated: ${chat_id} → ${language}`);
      }
    } catch (error) {
      console.error('[DB] Error updating language:', error);
    }
  }

  /**
   * Get user language preference
   */
  async getUserLanguage(chat_id: number): Promise<'ru' | 'pl' | 'en'> {
    if (!isSupabaseConfigured()) return 'ru';

    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('language')
        .eq('chat_id', chat_id)
        .single();

      if (error || !data) {
        return 'ru'; // Default
      }

      return data.language as 'ru' | 'pl' | 'en';
    } catch (error) {
      console.error('[DB] Error getting user language:', error);
      return 'ru';
    }
  }

  /**
   * ==================================
   * USAGE LOGGING
   * ==================================
   */

  /**
   * Log request
   */
  async logUsage(log: UsageLog): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.log('[DB] Supabase not configured, skipping usage log');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('usage_logs')
        .insert({
          chat_id: log.chat_id,
          request_type: log.request_type,
          command: log.command,
          request_data: log.request_data,
          status: log.status || 'pending',
          error_message: log.error_message,
          processing_time: log.processing_time
        });

      if (error) {
        console.error('[DB] Failed to log usage:', error);
      } else {
        console.log(`[DB] Usage logged: ${log.request_type} by ${log.chat_id}`);
      }
    } catch (error) {
      console.error('[DB] Error logging usage:', error);
    }
  }

  /**
   * ==================================
   * ARTICLE LOGGING
   * ==================================
   */

  /**
   * Log published article
   */
  async logArticle(article: PublishedArticle): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.log('[DB] Supabase not configured, skipping article log');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('published_articles')
        .insert({
          chat_id: article.chat_id,
          job_id: article.job_id,
          title: article.title,
          url_en: article.url_en,
          url_pl: article.url_pl,
          post_id_en: article.post_id_en,
          post_id_pl: article.post_id_pl,
          category: article.category,
          word_count: article.word_count,
          languages: article.languages,
          processing_time: article.processing_time,
          source: article.source,
          original_input: article.original_input
        });

      if (error) {
        console.error('[DB] Failed to log article:', error);
      } else {
        console.log(`[DB] Article logged: "${article.title}" by ${article.chat_id}`);
      }
    } catch (error) {
      console.error('[DB] Error logging article:', error);
    }
  }

  /**
   * ==================================
   * STATISTICS
   * ==================================
   */

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<any> {
    if (!isSupabaseConfigured()) {
      return {
        total_users: 0,
        active_users_24h: 0,
        total_articles: 0,
        total_requests: 0
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('global_statistics')
        .select('*')
        .single();

      if (error) {
        console.error('[DB] Failed to get global stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[DB] Error getting global stats:', error);
      return null;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(limit: number = 10): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await this.supabase
        .from('user_statistics')
        .select('*')
        .order('published_articles', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[DB] Failed to get user stats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DB] Error getting user stats:', error);
      return [];
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await this.supabase
        .from('category_statistics')
        .select('*');

      if (error) {
        console.error('[DB] Failed to get category stats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DB] Error getting category stats:', error);
      return [];
    }
  }

  /**
   * Get recent articles
   */
  async getRecentArticles(limit: number = 10): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await this.supabase
        .from('published_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[DB] Failed to get recent articles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DB] Error getting recent articles:', error);
      return [];
    }
  }

  /**
   * Get user's articles
   */
  async getUserArticles(chat_id: number, limit: number = 20): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await this.supabase
        .from('published_articles')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[DB] Failed to get user articles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DB] Error getting user articles:', error);
      return [];
    }
  }
}

// Singleton instance
export const telegramDB = new TelegramDatabaseService();












