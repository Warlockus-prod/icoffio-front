'use client';

/**
 * ARTICLE POPULARITY STATISTICS
 * 
 * Displays most viewed articles in admin dashboard
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArticlePopularity {
  article_slug: string;
  total_views: number;
  unique_views: number;
  last_viewed: string;
  popularity_score: number;
}

interface PopularityStats {
  total_views: number;
  total_unique_views: number;
  articles_tracked: number;
}

export function ArticlePopularityStats() {
  const [articles, setArticles] = useState<ArticlePopularity[]>([]);
  const [stats, setStats] = useState<PopularityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPopularity();
  }, []);

  async function fetchPopularity() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analytics/popular-articles?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch popularity');
      }

      const data = await response.json();
      setArticles(data.articles || []);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch article popularity:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Format slug for display (remove language suffix)
  function formatSlug(slug: string): string {
    return slug
      .replace(/-en$|-pl$|-de$|-es$|-ru$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Get relative time
  function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Article Popularity</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Article Popularity</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Article Popularity</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No article views tracked yet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Article Popularity</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Top {articles.length} most viewed
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total_views.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Total Views</div>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.total_unique_views.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Unique Views</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.articles_tracked}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Articles Tracked</div>
          </div>
        </div>
      )}

      {/* Top Articles List */}
      <div className="space-y-2">
        {articles.map((article, index) => (
          <div
            key={article.article_slug}
            className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            {/* Rank */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : ''}
              ${index === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : ''}
              ${index === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : ''}
              ${index > 2 ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400' : ''}
            `}>
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && index + 1}
            </div>

            {/* Article Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {formatSlug(article.article_slug)}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Last viewed {getRelativeTime(article.last_viewed)}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-sm font-bold text-neutral-900 dark:text-white">
                👁️ {article.total_views.toLocaleString()}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {article.unique_views} unique
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}










