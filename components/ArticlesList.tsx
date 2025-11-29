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

  // Сортировка статей
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'newest') {
      // Сортировка по дате публикации (новые сначала)
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    } else {
      // Сортировка по просмотрам (популярные сначала) - пока используем дату
      // TODO: Когда будет реальная аналитика, использовать views
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    }
  });

  return (
    <section className="py-8">
      {/* Tabs для сортировки */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {locale === 'en' ? 'Latest News' : locale === 'pl' ? 'Najnowsze wiadomości' : 'Последние новости'}
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
            {locale === 'en' ? '🆕 Newest' : locale === 'pl' ? '🆕 Najnowsze' : '🆕 Новые'}
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {locale === 'en' ? '🔥 Popular' : locale === 'pl' ? '🔥 Popularne' : '🔥 Популярные'}
          </button>
        </div>
      </div>

      {/* Сетка статей */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPosts.map((post) => (
          <ArticleCard key={post.slug} post={post} locale={locale} />
        ))}
      </div>

      {sortedPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            {locale === 'en' ? 'No articles yet' : locale === 'pl' ? 'Jeszcze nie ma artykułów' : 'Статей пока нет'}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            {locale === 'en' ? 'Interesting content coming soon' : locale === 'pl' ? 'Wkrótce pojawią się ciekawe treści' : 'Скоро появится интересный контент'}
          </p>
        </div>
      )}

      {/* Количество статей */}
      {sortedPosts.length > 0 && (
        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {locale === 'en' ? `Showing ${sortedPosts.length} ${sortedPosts.length === 1 ? 'article' : 'articles'}` : 
           locale === 'pl' ? `Pokazuje ${sortedPosts.length} ${sortedPosts.length === 1 ? 'artykuł' : sortedPosts.length < 5 ? 'artykuły' : 'artykułów'}` :
           `Показано ${sortedPosts.length} ${sortedPosts.length === 1 ? 'статья' : sortedPosts.length < 5 ? 'статьи' : 'статей'}`}
        </div>
      )}
    </section>
  );
}





