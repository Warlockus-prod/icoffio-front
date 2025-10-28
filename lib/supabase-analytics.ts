/**
 * SUPABASE ANALYTICS CLIENT
 * 
 * Для отслеживания просмотров статей и определения популярных статей
 */

import { createClient } from '@supabase/supabase-js';

// Ленивая инициализация клиента
let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Получить Supabase клиент (singleton)
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Supabase Analytics] Missing credentials, analytics disabled');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('[Supabase Analytics] Client initialized');
  }

  return supabaseClient;
}

/**
 * Записать просмотр статьи
 */
export async function trackArticleView(
  articleSlug: string,
  userIp?: string,
  referrer?: string,
  userAgent?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await (client as any)
      .from('article_views')
      .insert({
        article_slug: articleSlug,
        user_ip: userIp || null,
        referrer: referrer || null,
        user_agent: userAgent || null,
      });

    if (error) {
      console.error('[Supabase Analytics] Failed to track view:', error.message);
      return false;
    }

    console.log(`[Supabase Analytics] ✅ Tracked view: ${articleSlug}`);
    return true;
  } catch (error) {
    console.error('[Supabase Analytics] Exception tracking view:', error);
    return false;
  }
}

/**
 * Получить популярные статьи
 */
export async function getPopularArticles(limit: number = 10): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // Сначала обновляем materialized view (если нужно)
    try {
      await client.rpc('refresh_article_popularity');
    } catch (err) {
      // Игнорируем ошибку, если функция еще не создана
    }

    // Получаем популярные статьи
    const { data, error } = await (client as any)
      .from('article_popularity')
      .select('article_slug, total_views, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase Analytics] Failed to get popular articles:', error.message);
      return [];
    }

    const slugs = (data || []).map((row: any) => row.article_slug);
    console.log(`[Supabase Analytics] ✅ Got ${slugs.length} popular articles`);
    return slugs;
  } catch (error) {
    console.error('[Supabase Analytics] Exception getting popular articles:', error);
    return [];
  }
}

/**
 * Получить количество просмотров для статьи
 */
export async function getArticleViews(articleSlug: string): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  try {
    const { data, error } = await (client as any)
      .from('article_popularity')
      .select('total_views')
      .eq('article_slug', articleSlug)
      .single();

    if (error || !data) return 0;

    return data.total_views || 0;
  } catch (error) {
    console.error('[Supabase Analytics] Exception getting article views:', error);
    return 0;
  }
}

// ============================================
// TELEGRAM SUBMISSIONS TRACKING
// ============================================

export interface TelegramSubmission {
  id?: number;
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  submission_type: 'url' | 'text';
  submission_content: string;
  status: 'processing' | 'published' | 'failed';
  article_slug_en?: string;
  article_slug_pl?: string;
  article_url_en?: string;
  article_url_pl?: string;
  error_message?: string;
  error_details?: any;
  wp_post_id_en?: number;
  wp_post_id_pl?: number;
  submitted_at?: string;
  processed_at?: string;
  processing_time_ms?: number;
  category?: string;
  language?: string;
}

/**
 * Создать новую telegram submission
 */
export async function createTelegramSubmission(
  submission: Omit<TelegramSubmission, 'id' | 'submitted_at' | 'processed_at'>
): Promise<number | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await (client as any)
      .from('telegram_submissions')
      .insert(submission)
      .select('id')
      .single();

    if (error) {
      console.error('[Supabase Analytics] Failed to create telegram submission:', error.message);
      return null;
    }

    console.log(`[Supabase Analytics] ✅ Created submission ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('[Supabase Analytics] Exception creating telegram submission:', error);
    return null;
  }
}

/**
 * Обновить статус telegram submission
 */
export async function updateTelegramSubmission(
  submissionId: number,
  updates: Partial<TelegramSubmission>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await (client as any)
      .from('telegram_submissions')
      .update({
        ...updates,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      console.error('[Supabase Analytics] Failed to update telegram submission:', error.message);
      return false;
    }

    console.log(`[Supabase Analytics] ✅ Updated submission ID: ${submissionId}`);
    return true;
  } catch (error) {
    console.error('[Supabase Analytics] Exception updating telegram submission:', error);
    return false;
  }
}

/**
 * Получить все telegram submissions
 */
export async function getTelegramSubmissions(
  limit: number = 50,
  status?: 'processing' | 'published' | 'failed'
): Promise<TelegramSubmission[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = (client as any)
      .from('telegram_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase Analytics] Failed to get telegram submissions:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Supabase Analytics] Exception getting telegram submissions:', error);
    return [];
  }
}

/**
 * Получить статистику пользователя Telegram
 */
export async function getTelegramUserStats(userId: number): Promise<any> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await (client as any)
      .from('telegram_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return data;
  } catch (error) {
    console.error('[Supabase Analytics] Exception getting telegram user stats:', error);
    return null;
  }
}

