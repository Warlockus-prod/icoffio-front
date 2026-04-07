'use client';

import { useEffect, useState, useCallback } from 'react';
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
  ml: '🤖',
  cybersec: '🔒',
  design: '🎨',
  devops: '⚙️',
  default: '📋',
};

export function InfoHome() {
  const [boards, setBoards] = useState<InfoBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [boardForm, setBoardForm] = useState({ title: '', slug: '', subtitle: '' });

  const loadBoards = useCallback(() => {
    fetch('/api/info/boards')
      .then((r) => r.json())
      .then((data) => { setBoards(data.boards || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

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

  const deleteBoard = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this board and all its content?')) return;
    await fetch(`/api/info/boards?id=${id}`, { method: 'DELETE' });
    flash('Board deleted');
    loadBoards();
  };

  const moveBoard = async (id: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = boards.findIndex(b => b.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= boards.length) return;

    await Promise.all([
      fetch('/api/info/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boards[idx].id, sort_order: boards[swapIdx].sort_order }),
      }),
      fetch('/api/info/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boards[swapIdx].id, sort_order: boards[idx].sort_order }),
      }),
    ]);
    loadBoards();
  };

  const addBoard = async () => {
    if (!boardForm.title || !boardForm.slug) return;
    await fetch('/api/info/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...boardForm, sort_order: (boards.length + 1) * 10 }),
    });
    setBoardForm({ title: '', slug: '', subtitle: '' });
    setShowAddBoard(false);
    flash('Board added');
    loadBoards();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#1a1a2e] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link href="/en/info" className="text-2xl font-bold text-[#333] dark:text-[#e0e0e0] hover:opacity-80 transition-opacity">
          infomate
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
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
          )}
          <InfoThemeToggle />
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm">
          {message}
        </div>
      )}

      {/* Boards Grid */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#16213e] rounded-2xl p-6 h-40" />
            ))}
          </div>
        ) : boards.length === 0 && !editMode ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500 dark:text-gray-400">No boards configured yet.</p>
          </div>
        ) : (
          <>
          {/* Market Watch Featured Card */}
          <Link
            href="/en/info/watch"
            className="group mb-6 block bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20
                       rounded-2xl p-5 hover:shadow-lg transition-all duration-200
                       border border-purple-200/50 dark:border-purple-700/30 hover:border-purple-300 dark:hover:border-purple-600"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">🔭</span>
              <div>
                <h2 className="text-lg font-bold text-[#333] dark:text-[#e0e0e0]">Market Watch</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Competitor monitoring, industry trends & AI-powered analysis</p>
              </div>
              <span className="ml-auto text-gray-300 dark:text-gray-600 group-hover:text-purple-400 transition-colors text-2xl">&rarr;</span>
            </div>
          </Link>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {boards.map((board, idx) => (
              <Link
                key={board.id}
                href={`/en/info/${board.slug}`}
                className="group relative bg-white dark:bg-[#16213e] rounded-2xl p-6 flex flex-col items-center text-center
                           hover:shadow-lg hover:-translate-y-1 transition-all duration-200
                           border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
              >
                {/* Edit controls */}
                {editMode && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                    <button onClick={(e) => moveBoard(board.id, 'up', e)} disabled={idx === 0}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30">◀</button>
                    <button onClick={(e) => moveBoard(board.id, 'down', e)} disabled={idx === boards.length - 1}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-700 text-white rounded-full hover:bg-gray-600 disabled:opacity-30">▶</button>
                    <button onClick={(e) => deleteBoard(board.id, e)}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700">✕</button>
                  </div>
                )}
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

            {/* Add Board card */}
            {editMode && (
              showAddBoard ? (
                <div className="bg-white dark:bg-[#16213e] rounded-2xl p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 space-y-2">
                  <input type="text" placeholder="Title" value={boardForm.title}
                    onChange={(e) => setBoardForm({ ...boardForm, title: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                  <input type="text" placeholder="slug" value={boardForm.slug}
                    onChange={(e) => setBoardForm({ ...boardForm, slug: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                  <input type="text" placeholder="Subtitle" value={boardForm.subtitle}
                    onChange={(e) => setBoardForm({ ...boardForm, subtitle: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                  <div className="flex gap-1">
                    <button onClick={addBoard} className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded">Add</button>
                    <button onClick={() => setShowAddBoard(false)} className="flex-1 px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddBoard(true)}
                  className="bg-white/50 dark:bg-[#16213e]/50 rounded-2xl p-6 flex flex-col items-center justify-center
                             border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <span className="text-4xl text-gray-300 dark:text-gray-600 mb-2">+</span>
                  <span className="text-sm text-gray-400">Add Board</span>
                </button>
              )
            )}
          </div>
          </>
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
