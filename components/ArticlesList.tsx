'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ArticleCard } from './ArticleCard';
import type { Post } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());
const LIST_LIMIT = 12;
const POPULAR_LOOKUP_LIMIT = 50;

interface ArticlesListProps {
  posts: Post[];       // Server-side initial data (SSR)
  locale: string;
}

interface ArticlesApiResponse {
  success?: boolean;
  articles?: Post[];
}

interface PopularArticleRow {
  article_slug?: string;
}

interface PopularArticlesApiResponse {
  success?: boolean;
  articles?: PopularArticleRow[];
}

function normalizeTimestamp(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function sortByDateDesc(items: Post[]) {
  return [...items].sort((a, b) => {
    const bTs = normalizeTimestamp(b.publishedAt || b.date);
    const aTs = normalizeTimestamp(a.publishedAt || a.date);
    return bTs - aTs;
  });
}

function dedupeBySlug(items: Post[]) {
  const bySlug = new Map<string, Post>();

  for (const item of items) {
    if (!item?.slug) continue;
    if (!bySlug.has(item.slug)) {
      bySlug.set(item.slug, item);
    }
  }

  return Array.from(bySlug.values());
}

/**
 * Articles list with SWR: instant from cache on navigation, background refresh.
 * Server-side `posts` prop serves as fallback; SWR revalidates in the background.
 */
export function ArticlesList({ posts: serverPosts, locale }: ArticlesListProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('popular');

  // Latest articles for "Newest" tab
  const { data: latestData } = useSWR<ArticlesApiResponse>(
    `/api/supabase-articles?lang=${locale}&limit=${LIST_LIMIT}`,
    fetcher,
    {
      fallbackData: { success: true, articles: serverPosts },
      revalidateOnFocus: false,
      revalidateOnMount: true,      // Refresh on mount (catches new articles)
      dedupingInterval: 60_000,     // Don't re-fetch within 1 min
      refreshInterval: 5 * 60_000,  // Background refresh every 5 min
    }
  );

  // Popularity ranking from analytics for "Popular" tab
  const { data: popularData } = useSWR<PopularArticlesApiResponse>(
    `/api/analytics/popular-articles?locale=${locale}&limit=${POPULAR_LOOKUP_LIMIT}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 60_000,
      refreshInterval: 5 * 60_000,
    }
  );

  // Pool for sorting: latest + server fallback (deduped by slug)
  const latestPosts: Post[] = latestData?.success && Array.isArray(latestData.articles)
    ? latestData.articles
    : serverPosts;
  const postsPool = dedupeBySlug([...latestPosts, ...serverPosts]);
  const newestPosts = sortByDateDesc(postsPool).slice(0, LIST_LIMIT);

  const popularSlugs = (popularData?.success && Array.isArray(popularData.articles))
    ? popularData.articles
        .map((row) => row.article_slug)
        .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    : [];

  const popularRank = new Map(popularSlugs.map((slug, index) => [slug, index]));
  const popularPosts = [...postsPool]
    .sort((a, b) => {
      const aRank = popularRank.get(a.slug);
      const bRank = popularRank.get(b.slug);

      const aHasRank = Number.isInteger(aRank);
      const bHasRank = Number.isInteger(bRank);

      if (aHasRank && bHasRank) {
        return (aRank as number) - (bRank as number);
      }

      if (aHasRank) return -1;
      if (bHasRank) return 1;

      const bTs = normalizeTimestamp(b.publishedAt || b.date);
      const aTs = normalizeTimestamp(a.publishedAt || a.date);
      return bTs - aTs;
    })
    .slice(0, LIST_LIMIT);

  const visiblePosts = sortBy === 'popular' ? popularPosts : newestPosts;

  const t = {
    title: locale === 'pl' ? 'Najnowsze wiadomości' : 'Latest News',
    newest: locale === 'pl' ? '🆕 Najnowsze' : '🆕 Newest',
    popular: locale === 'pl' ? '🔥 Popularne' : '🔥 Popular',
    noArticles: locale === 'pl' ? 'Jeszcze nie ma artykułów' : 'No articles yet',
    comingSoon: locale === 'pl' ? 'Wkrótce pojawią się ciekawe treści' : 'Interesting content coming soon',
    showing: locale === 'pl' ? 'Pokazuje' : 'Showing',
    article: locale === 'pl' ? 'artykuł' : 'article',
    articles: locale === 'pl' ? 'artykułów' : 'articles',
  };

  return (
    <section className="py-8">
      {/* Sorting tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h2>
        
        <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'newest'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t.newest}
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t.popular}
          </button>
        </div>
      </div>

      {/* Articles grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePosts.map((post) => (
          <ArticleCard key={post.slug} post={post} locale={locale} />
        ))}
      </div>

      {visiblePosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            {t.noArticles}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.comingSoon}
          </p>
        </div>
      )}

      {visiblePosts.length > 0 && (
        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t.showing} {visiblePosts.length} {visiblePosts.length === 1 ? t.article : t.articles}
        </div>
      )}
    </section>
  );
}
