'use client';

import { useState } from 'react';
import { ArticleCard } from './ArticleCard';
import type { Post } from '@/lib/types';

interface ArticlesListProps {
  posts: Post[];
  locale: string;
}

export function ArticlesList({ posts, locale }: ArticlesListProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('popular');

  // Sort articles
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    } else {
      // TODO: Use real view counts from Supabase when available
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    }
  });

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
        {sortedPosts.map((post) => (
          <ArticleCard key={post.slug} post={post} locale={locale} />
        ))}
      </div>

      {sortedPosts.length === 0 && (
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

      {/* Articles count */}
      {sortedPosts.length > 0 && (
        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t.showing} {sortedPosts.length} {sortedPosts.length === 1 ? t.article : t.articles}
        </div>
      )}
    </section>
  );
}





