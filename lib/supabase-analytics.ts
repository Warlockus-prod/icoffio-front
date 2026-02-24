/**
 * SUPABASE ANALYTICS CLIENT
 * 
 * Для отслеживания просмотров статей и определения популярных статей
 */

import { createClient, isSupabaseConfigured } from '@/lib/pg-client';
import { getRateLimiter, RateLimits } from './rate-limiter';

// Ленивая инициализация клиента
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Cache для популярных статей
let popularArticlesCache: { data: string[]; timestamp: number } | null = null;
const POPULAR_ARTICLES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Получить Supabase клиент (singleton)
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!isSupabaseConfigured()) {
      console.warn('[Supabase Analytics] DATABASE_URL is not configured, analytics disabled');
      return null;
    }

    supabaseClient = createClient();

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

  // Rate limiting: 1 view per IP per article per hour
  const rateLimiter = getRateLimiter();
  const rateLimitKey = `article_view:${articleSlug}:${userIp || 'unknown'}`;
  
  if (!rateLimiter.isAllowed(rateLimitKey, RateLimits.ARTICLE_VIEW.maxRequests, RateLimits.ARTICLE_VIEW.windowMs)) {
    console.log(`[Supabase Analytics] ⏳ Rate limited: ${articleSlug}`);
    return false; // Skip tracking to save function invocations
  }

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
 * Получить популярные статьи с фильтрацией по языку
 */
export async function getPopularArticles(limit: number = 10, locale?: string): Promise<string[]> {
  // Check cache first (15 min TTL) - OPTIMIZATION to reduce DB calls
  const cacheKey = locale ? `${locale}:${limit}` : `all:${limit}`;
  const now = Date.now();
  
  if (popularArticlesCache && (now - popularArticlesCache.timestamp) < POPULAR_ARTICLES_CACHE_TTL) {
    console.log(`[Supabase Analytics] 💾 Using cached popular articles (${popularArticlesCache.data.length})`);
    // Если есть locale, фильтруем по языковому суффиксу
    if (locale) {
      const filtered = popularArticlesCache.data.filter(slug => slug.endsWith(`-${locale}`));
      console.log(`[Supabase Analytics] 🌍 Filtered for ${locale}: ${filtered.length} articles`);
      return filtered.slice(0, limit);
    }
    return popularArticlesCache.data.slice(0, limit);
  }

  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // Skip materialized view refresh to save CPU time
    // Will be refreshed by scheduled Supabase function instead
    
    // Получаем популярные статьи
    let query = (client as any)
      .from('article_popularity')
      .select('article_slug, total_views, popularity_score')
      .order('popularity_score', { ascending: false });
    
    // Фильтруем по языку если указан
    if (locale) {
      query = query.like('article_slug', `%-${locale}`);
      console.log(`[Supabase Analytics] 🌍 Filtering popular articles for locale: ${locale}`);
    }
    
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase Analytics] Failed to get popular articles:', error.message);
      return [];
    }

    const slugs = (data || []).map((row: any) => row.article_slug);
    
    // Update cache (кэшируем все статьи без фильтра)
    if (!locale) {
      popularArticlesCache = {
        data: slugs,
        timestamp: now
      };
    }
    
    console.log(`[Supabase Analytics] ✅ Got ${slugs.length} popular articles${locale ? ` for ${locale}` : ''}`);
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
  chat_id?: number;
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  submission_type: 'url' | 'text';
  submission_content: string;
  status: 'queued' | 'processing' | 'published' | 'failed';
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
    const payload: Record<string, any> = { ...(submission as any) };

    // Backward-compatible fallback for schemas where chat_id is NOT NULL.
    if (payload.chat_id == null && typeof payload.user_id === 'number') {
      payload.chat_id = payload.user_id;
    }

    const { data, error } = await (client as any)
      .from('telegram_submissions')
      .insert(payload)
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
  status?: 'queued' | 'processing' | 'published' | 'failed'
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
