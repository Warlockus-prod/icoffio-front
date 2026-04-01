'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InfoBoardFull } from '@/lib/info/types';
import { InfoThemeToggle } from './InfoThemeToggle';
import { FeedColumn } from './FeedColumn';

export function InfoBoardPage({ slug }: { slug: string }) {
  const [board, setBoard] = useState<InfoBoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/info/boards?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.board) {
          setBoard(data.board);
        } else {
          setError('Board not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-500">{error || 'Not found'}</p>
          <Link href="/en/info" className="text-blue-500 hover:underline mt-4 inline-block">
            &larr; Back to boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto">
        <Link href="/en/info" className="text-2xl font-bold text-[#333] dark:text-[#e0e0e0] hover:opacity-80 transition-opacity">
          infomate
        </Link>
        <InfoThemeToggle />
      </header>

      {/* Board Header */}
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/en/info" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
            &larr; All boards
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-[#333] dark:text-[#e0e0e0]">{board.title}</h1>
        {board.subtitle && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">{board.subtitle}</p>
        )}
      </div>

      {/* Blocks */}
      <main className="max-w-[1400px] mx-auto px-6 pb-12">
        {board.blocks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No feeds configured for this board yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {board.blocks.map((block) => (
              <section key={block.id}>
                {/* Block Header */}
                <h2 className="text-lg font-semibold text-[#333] dark:text-[#e0e0e0] mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {block.title}
                </h2>

                {/* Feeds Grid */}
                <div
                  className={
                    block.layout === 'half'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : `grid gap-4 ${
                          block.feeds.length <= 3
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        }`
                  }
                >
                  {block.feeds.map((feed) => (
                    <FeedColumn key={feed.id} feed={feed} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
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
