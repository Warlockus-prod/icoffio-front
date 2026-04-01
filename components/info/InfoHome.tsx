'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InfoBoard } from '@/lib/info/types';
import { InfoThemeToggle } from './InfoThemeToggle';

const BOARD_ICONS: Record<string, string> = {
  news: '📰',
  tech: '💻',
  crypto: '₿',
  games: '🎮',
  science: '🔬',
  business: '📊',
  sports: '⚽',
  music: '🎵',
  movies: '🎬',
  default: '📋',
};

export function InfoHome() {
  const [boards, setBoards] = useState<InfoBoard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/info/boards')
      .then((r) => r.json())
      .then((data) => {
        setBoards(data.boards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link href="/en/info" className="text-2xl font-bold text-[#333] dark:text-[#e0e0e0] hover:opacity-80 transition-opacity">
          infomate
        </Link>
        <InfoThemeToggle />
      </header>

      {/* Boards Grid */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#16213e] rounded-2xl p-6 h-40" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500 dark:text-gray-400">No boards configured yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Go to Admin &rarr; Info Portal to add boards and feeds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/en/info/${board.slug}`}
                className="group bg-white dark:bg-[#16213e] rounded-2xl p-6 flex flex-col items-center text-center
                           hover:shadow-lg hover:-translate-y-1 transition-all duration-200
                           border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                  {board.icon_url ? (
                    <img src={board.icon_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    BOARD_ICONS[board.slug] || BOARD_ICONS.default
                  )}
                </div>
                <h2 className="text-lg font-semibold text-[#333] dark:text-[#e0e0e0] mb-1">
                  {board.title}
                </h2>
                {board.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {board.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
        <p>
          Powered by{' '}
          <a href="https://web.icoffio.com" className="underline hover:text-gray-600 dark:hover:text-gray-300">
            icoffio
          </a>
        </p>
      </footer>
    </div>
  );
}
