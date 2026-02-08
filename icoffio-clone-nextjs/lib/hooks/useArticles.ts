'use client';

import useSWR from 'swr';
import type { Post } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ArticlesResponse {
  success: boolean;
  articles: Post[];
  total: number;
}

/**
 * Client-side article fetching with SWR caching.
 * Data is served instantly from cache, then revalidated in the background.
 */
export function useArticles(locale: string = 'en', limit: number = 12) {
  const { data, error, isLoading, mutate } = useSWR<ArticlesResponse>(
    `/api/supabase-articles?lang=${locale}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000, // Dedupe requests within 1 min
      refreshInterval: 5 * 60_000, // Background refresh every 5 min
      fallbackData: { success: true, articles: [], total: 0 },
    }
  );

  return {
    articles: data?.articles || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

/**
 * Fetch articles by category with SWR caching
 */
export function useArticlesByCategory(locale: string, category: string, limit: number = 24) {
  const { data, error, isLoading } = useSWR<ArticlesResponse>(
    category ? `/api/supabase-articles?lang=${locale}&category=${category}&limit=${limit}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      refreshInterval: 5 * 60_000,
    }
  );

  return {
    articles: data?.articles || [],
    isLoading,
    isError: !!error,
  };
}

/**
 * Fetch single article by slug with SWR caching
 */
export function useArticle(slug: string, locale: string = 'en') {
  const { data, error, isLoading } = useSWR(
    slug ? `/api/supabase-articles?action=get-by-slug&slug=${slug}&lang=${locale}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120_000, // Articles change rarely
    }
  );

  return {
    article: data?.article || null,
    isLoading,
    isError: !!error,
  };
}
