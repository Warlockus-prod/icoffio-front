'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { InfoBoardFull, InfoBlockWithFeeds, InfoFeed, InfoFeedItem } from '@/lib/info/types';
import { InfoThemeToggle } from './InfoThemeToggle';
import { FeedColumn } from './FeedColumn';

export function InfoBoardPage({ slug }: { slug: string }) {
  const [board, setBoard] = useState<InfoBoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  // Quick-add feed form
  const [addingToBlock, setAddingToBlock] = useState<number | null>(null);
  const [quickForm, setQuickForm] = useState({ title: '', feed_url: '', telegram_channel: '', feed_type: 'rss' as string });

  // Add block form
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState('');

  const loadBoard = useCallback(() => {
    fetch(`/api/info/boards?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.board) setBoard(data.board);
        else setError('Board not found');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [slug]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Check admin session
  useEffect(() => {
    try {
      const session = localStorage.getItem('admin_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.token && parsed.expires > Date.now()) setIsAdmin(true);
      }
    } catch {}
  }, []);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // ---- CRUD operations ----

  const deleteFeed = async (feedId: number) => {
    if (!confirm('Delete this feed?')) return;
    await fetch(`/api/info/feeds?id=${feedId}`, { method: 'DELETE' });
    flash('Feed deleted');
    loadBoard();
  };

  const deleteBlock = async (blockId: number) => {
    if (!confirm('Delete this block and all its feeds?')) return;
    await fetch(`/api/info/blocks?id=${blockId}`, { method: 'DELETE' });
    flash('Block deleted');
    loadBoard();
  };

  const moveBlock = async (blockId: number, direction: 'up' | 'down') => {
    if (!board) return;
    const idx = board.blocks.findIndex(b => b.id === blockId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= board.blocks.length) return;

    const current = board.blocks[idx];
    const swap = board.blocks[swapIdx];

    await Promise.all([
      fetch('/api/info/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, sort_order: swap.sort_order }),
      }),
      fetch('/api/info/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: swap.id, sort_order: current.sort_order }),
      }),
    ]);
    loadBoard();
  };

  const moveFeed = async (feedId: number, blockId: number, direction: 'up' | 'down') => {
    if (!board) return;
    const block = board.blocks.find(b => b.id === blockId);
    if (!block) return;
    const idx = block.feeds.findIndex(f => f.id === feedId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= block.feeds.length) return;

    const current = block.feeds[idx];
    const swap = block.feeds[swapIdx];

    await Promise.all([
      fetch('/api/info/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, sort_order: swap.sort_order }),
      }),
      fetch('/api/info/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: swap.id, sort_order: current.sort_order }),
      }),
    ]);
    loadBoard();
  };

  const addFeed = async () => {
    if (!quickForm.title || !addingToBlock) return;
    const payload: any = {
      block_id: addingToBlock,
      title: quickForm.title,
      feed_type: quickForm.feed_type,
    };

    if (quickForm.feed_type === 'telegram') {
      const handle = quickForm.telegram_channel.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
      payload.feed_url = `http://172.17.0.1:1200/telegram/channel/${handle}`;
      payload.site_url = `https://t.me/${handle}`;
      payload.telegram_channel = handle;
    } else {
      payload.feed_url = quickForm.feed_url;
    }

    await fetch('/api/info/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setQuickForm({ title: '', feed_url: '', telegram_channel: '', feed_type: 'rss' });
    setAddingToBlock(null);
    flash('Feed added');
    loadBoard();
  };

  const addBlock = async () => {
    if (!newBlockTitle || !board) return;
    await fetch('/api/info/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: board.id, title: newBlockTitle, layout: 'full', sort_order: (board.blocks.length + 1) * 10 }),
    });
    setNewBlockTitle('');
    setShowAddBlock(false);
    flash('Block added');
    loadBoard();
  };

  const fetchAllFeeds = async () => {
    flash('Fetching all feeds...');
    const res = await fetch('/api/info/fetch-feeds', { method: 'POST' });
    const data = await res.json();
    flash(`Fetched ${data.total} items from ${data.feeds} feeds`);
    loadBoard();
  };

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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  editMode
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {editMode ? '✏️ Editing' : '✏️ Edit'}
              </button>
              {editMode && (
                <button
                  onClick={fetchAllFeeds}
                  className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                >
                  🔄 Fetch
                </button>
              )}
            </>
          )}
          <InfoThemeToggle />
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm animate-pulse">
          {message}
        </div>
      )}

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
        {board.blocks.length === 0 && !editMode ? (
          <div className="text-center py-16 text-gray-400">
            <p>No feeds configured for this board yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {board.blocks.map((block, blockIdx) => (
              <section key={block.id} className={editMode ? 'relative border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4' : ''}>
                {/* Block Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-[#333] dark:text-[#e0e0e0]">
                    {block.title}
                  </h2>
                  {editMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={blockIdx === 0}
                        className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 disabled:opacity-30"
                        title="Move up"
                      >▲</button>
                      <button
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={blockIdx === board.blocks.length - 1}
                        className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 disabled:opacity-30"
                        title="Move down"
                      >▼</button>
                      <button
                        onClick={() => setAddingToBlock(addingToBlock === block.id ? null : block.id)}
                        className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >+ Feed</button>
                      <button
                        onClick={() => deleteBlock(block.id)}
                        className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >🗑</button>
                    </div>
                  )}
                </div>

                {/* Quick Add Feed Form */}
                {editMode && addingToBlock === block.id && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                    <select
                      value={quickForm.feed_type}
                      onChange={(e) => setQuickForm({ ...quickForm, feed_type: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="rss">RSS</option>
                      <option value="atom">Atom</option>
                      <option value="telegram">Telegram Channel</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Title"
                      value={quickForm.title}
                      onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                    />
                    {quickForm.feed_type === 'telegram' ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-400">t.me/</span>
                        <input
                          type="text"
                          placeholder="channel_name"
                          value={quickForm.telegram_channel}
                          onChange={(e) => setQuickForm({ ...quickForm, telegram_channel: e.target.value.replace(/^@/, '') })}
                          className="flex-1 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="RSS/Atom URL"
                        value={quickForm.feed_url}
                        onChange={(e) => setQuickForm({ ...quickForm, feed_url: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                      />
                    )}
                    <div className="flex gap-2">
                      <button onClick={addFeed} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                      <button onClick={() => setAddingToBlock(null)} className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400">Cancel</button>
                    </div>
                  </div>
                )}

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
                  {block.feeds.map((feed, feedIdx) => (
                    <div key={feed.id} className="relative">
                      {editMode && (
                        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5">
                          <button
                            onClick={() => moveFeed(feed.id, block.id, 'up')}
                            disabled={feedIdx === 0}
                            className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30"
                            title="Move left"
                          >◀</button>
                          <button
                            onClick={() => moveFeed(feed.id, block.id, 'down')}
                            disabled={feedIdx === block.feeds.length - 1}
                            className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30"
                            title="Move right"
                          >▶</button>
                          <button
                            onClick={() => deleteFeed(feed.id)}
                            className="w-5 h-5 flex items-center justify-center text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700"
                            title="Delete feed"
                          >✕</button>
                        </div>
                      )}
                      <FeedColumn feed={feed} />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Add Block button */}
            {editMode && (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
                {showAddBlock ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Block title..."
                      value={newBlockTitle}
                      onChange={(e) => setNewBlockTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && addBlock()}
                    />
                    <button onClick={addBlock} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Block</button>
                    <button onClick={() => { setShowAddBlock(false); setNewBlockTitle(''); }} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddBlock(true)}
                    className="w-full text-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm py-2"
                  >
                    + Add Block
                  </button>
                )}
              </div>
            )}
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
