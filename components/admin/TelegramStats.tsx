'use client';

/**
 * TELEGRAM BOT STATISTICS
 * 
 * Displays Telegram bot activity stats in admin dashboard
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TelegramStatsData {
  total: number;
  processing: number;
  published: number;
  failed: number;
  url_submissions: number;
  text_submissions: number;
}

export function TelegramStats() {
  const [stats, setStats] = useState<TelegramStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/telegram/submissions?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch Telegram stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Telegram Bot</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          <div className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
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
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Telegram Bot</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const successRate = stats.total > 0 
    ? Math.round((stats.published / stats.total) * 100) 
    : 0;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Telegram Bot</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Last 100 submissions
            </p>
          </div>
        </div>
        <Link 
          href="/en/admin/telegram"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
          <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            📊 Total Submissions
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
            {successRate}%
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            ✅ Success Rate
          </div>
        </div>

        {/* Published */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {stats.published}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            📢 Published
          </div>
        </div>

        {/* Failed */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {stats.failed}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            ❌ Failed
          </div>
        </div>
      </div>

      {/* Type Distribution */}
      <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">🔗 URLs:</span>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
            {stats.url_submissions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">📝 Text:</span>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
            {stats.text_submissions}
          </span>
        </div>
        {stats.processing > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-sm text-orange-600 dark:text-orange-400">
              {stats.processing} processing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}






