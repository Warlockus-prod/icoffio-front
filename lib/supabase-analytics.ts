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
    const { error } = await client
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
    await client.rpc('refresh_article_popularity').catch(() => {
      // Игнорируем ошибку, если функция еще не создана
    });

    // Получаем популярные статьи
    const { data, error } = await client
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
    const { data, error } = await client
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

