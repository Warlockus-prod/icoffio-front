'use client';

import { useEffect, useState, useCallback } from 'react';
import type { InfoBoard, InfoBlock, InfoFeed } from '@/lib/info/types';

export function InfoAdminPanel() {
  const [boards, setBoards] = useState<InfoBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<InfoBoard | null>(null);
  const [blocks, setBlocks] = useState<InfoBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<InfoBlock | null>(null);
  const [feeds, setFeeds] = useState<InfoFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingFeeds, setFetchingFeeds] = useState(false);
  const [fetchResult, setFetchResult] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [cleaningUp, setCleaningUp] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [stats, setStats] = useState<{ total_items: number; oldest: string } | null>(null);

  // Forms
  const [boardForm, setBoardForm] = useState({ title: '', slug: '', subtitle: '' });
  const [blockForm, setBlockForm] = useState({ title: '', layout: 'full' });
  const [feedForm, setFeedForm] = useState({ title: '', feed_url: '', site_url: '', telegram_channel: '', feed_type: 'rss' });

  const loadBoards = useCallback(async () => {
    const res = await fetch('/api/info/boards?admin=1');
    const data = await res.json();
    setBoards(data.boards || []);
    setLoading(false);
  }, []);

  const loadBlocks = useCallback(async (boardId: number) => {
    const res = await fetch(`/api/info/blocks?board_id=${boardId}`);
    const data = await res.json();
    setBlocks(data.blocks || []);
  }, []);

  const loadFeeds = useCallback(async (blockId: number) => {
    const res = await fetch(`/api/info/feeds?block_id=${blockId}`);
    const data = await res.json();
    setFeeds(data.feeds || []);
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/info/settings');
    const data = await res.json();
    if (data.settings?.retention_days) {
      setRetentionDays(data.settings.retention_days);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/info/feed-items?stats=1');
      const data = await res.json();
      setStats(data.stats || null);
    } catch {}
  }, []);

  useEffect(() => { loadBoards(); loadSettings(); loadStats(); }, [loadBoards, loadSettings, loadStats]);

  useEffect(() => {
    if (selectedBoard) {
      loadBlocks(selectedBoard.id);
      setSelectedBlock(null);
      setFeeds([]);
    }
  }, [selectedBoard, loadBlocks]);

  useEffect(() => {
    if (selectedBlock) {
      loadFeeds(selectedBlock.id);
    }
  }, [selectedBlock, loadFeeds]);

  const addBoard = async () => {
    if (!boardForm.title || !boardForm.slug) return;
    await fetch('/api/info/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boardForm),
    });
    setBoardForm({ title: '', slug: '', subtitle: '' });
    loadBoards();
  };

  const deleteBoard = async (id: number) => {
    if (!confirm('Delete this board and all its blocks/feeds?')) return;
    await fetch(`/api/info/boards?id=${id}`, { method: 'DELETE' });
    if (selectedBoard?.id === id) {
      setSelectedBoard(null);
      setBlocks([]);
    }
    loadBoards();
  };

  const addBlock = async () => {
    if (!blockForm.title || !selectedBoard) return;
    await fetch('/api/info/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...blockForm, board_id: selectedBoard.id }),
    });
    setBlockForm({ title: '', layout: 'full' });
    loadBlocks(selectedBoard.id);
  };

  const deleteBlock = async (id: number) => {
    if (!confirm('Delete this block and all its feeds?')) return;
    await fetch(`/api/info/blocks?id=${id}`, { method: 'DELETE' });
    if (selectedBlock?.id === id) {
      setSelectedBlock(null);
      setFeeds([]);
    }
    if (selectedBoard) loadBlocks(selectedBoard.id);
  };

  const addFeed = async () => {
    if (!feedForm.title || !selectedBlock) return;
    await fetch('/api/info/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...feedForm, block_id: selectedBlock.id }),
    });
    setFeedForm({ title: '', feed_url: '', site_url: '', telegram_channel: '', feed_type: 'rss' });
    loadFeeds(selectedBlock.id);
  };

  const deleteFeed = async (id: number) => {
    if (!confirm('Delete this feed?')) return;
    await fetch(`/api/info/feeds?id=${id}`, { method: 'DELETE' });
    if (selectedBlock) loadFeeds(selectedBlock.id);
  };

  const fetchAllFeeds = async () => {
    setFetchingFeeds(true);
    setFetchResult('');
    try {
      const res = await fetch('/api/info/fetch-feeds', { method: 'POST' });
      const data = await res.json();
      setFetchResult(`Fetched ${data.total} items from ${data.feeds} feeds`);
    } catch (err: any) {
      setFetchResult(`Error: ${err.message}`);
    }
    setFetchingFeeds(false);
  };

  const saveRetention = async () => {
    setSavingSettings(true);
    await fetch('/api/info/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retention_days: retentionDays }),
    });
    setSavingSettings(false);
    setFetchResult(`Retention set to ${retentionDays} days`);
  };

  const runCleanup = async () => {
    setCleaningUp(true);
    try {
      const res = await fetch('/api/info/cleanup', { method: 'POST' });
      const data = await res.json();
      setFetchResult(`Cleanup: deleted ${data.deleted} items older than ${data.retention_days} days`);
      loadStats();
    } catch (err: any) {
      setFetchResult(`Cleanup error: ${err.message}`);
    }
    setCleaningUp(false);
  };

  const fetchSingleFeed = async (feedId: number) => {
    try {
      const res = await fetch('/api/info/fetch-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_id: feedId }),
      });
      const data = await res.json();
      setFetchResult(`Feed: ${data.items_fetched} items fetched`);
    } catch (err: any) {
      setFetchResult(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Info Portal Admin</h1>
        <div className="flex items-center gap-3">
          <a
            href="/en/info"
            target="_blank"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            View Portal &rarr;
          </a>
          <button
            onClick={fetchAllFeeds}
            disabled={fetchingFeeds}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {fetchingFeeds ? 'Fetching...' : 'Fetch All Feeds'}
          </button>
        </div>
      </div>

      {fetchResult && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">{fetchResult}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Boards */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Boards</h2>

          {/* Add Board Form */}
          <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <input
              type="text"
              placeholder="Title"
              value={boardForm.title}
              onChange={(e) => setBoardForm({ ...boardForm, title: e.target.value })}
              className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
            />
            <input
              type="text"
              placeholder="Slug (e.g. news)"
              value={boardForm.slug}
              onChange={(e) => setBoardForm({ ...boardForm, slug: e.target.value })}
              className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
            />
            <input
              type="text"
              placeholder="Subtitle (optional)"
              value={boardForm.subtitle}
              onChange={(e) => setBoardForm({ ...boardForm, subtitle: e.target.value })}
              className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
            />
            <button
              onClick={addBoard}
              className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Add Board
            </button>
          </div>

          {/* Board List */}
          <ul className="space-y-1">
            {boards.map((board) => (
              <li
                key={board.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm
                  ${selectedBoard?.id === board.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => setSelectedBoard(board)}
              >
                <span>
                  <span className="font-medium">{board.title}</span>
                  <span className="text-gray-400 ml-1">/{board.slug}</span>
                  {!board.is_active && <span className="text-red-400 ml-1">(off)</span>}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  del
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Blocks */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">
            Blocks {selectedBoard && <span className="text-gray-400 text-sm">({selectedBoard.title})</span>}
          </h2>

          {selectedBoard ? (
            <>
              <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <input
                  type="text"
                  placeholder="Block title"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
                <select
                  value={blockForm.layout}
                  onChange={(e) => setBlockForm({ ...blockForm, layout: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                >
                  <option value="full">Full width</option>
                  <option value="half">Half width</option>
                </select>
                <button
                  onClick={addBlock}
                  className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Add Block
                </button>
              </div>

              <ul className="space-y-1">
                {blocks.map((block) => (
                  <li
                    key={block.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm
                      ${selectedBlock?.id === block.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    onClick={() => setSelectedBlock(block)}
                  >
                    <span>
                      {block.title}
                      <span className="text-gray-400 ml-1">({block.layout})</span>
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      del
                    </button>
                  </li>
                ))}
                {blocks.length === 0 && (
                  <p className="text-gray-400 text-sm italic">No blocks yet</p>
                )}
              </ul>
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">Select a board first</p>
          )}
        </div>

        {/* Column 3: Feeds */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">
            Feeds {selectedBlock && <span className="text-gray-400 text-sm">({selectedBlock.title})</span>}
          </h2>

          {selectedBlock ? (
            <>
              <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <input
                  type="text"
                  placeholder="Feed title"
                  value={feedForm.title}
                  onChange={(e) => setFeedForm({ ...feedForm, title: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
                <input
                  type="text"
                  placeholder="RSS/Atom URL"
                  value={feedForm.feed_url}
                  onChange={(e) => setFeedForm({ ...feedForm, feed_url: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
                <input
                  type="text"
                  placeholder="Site URL"
                  value={feedForm.site_url}
                  onChange={(e) => setFeedForm({ ...feedForm, site_url: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
                <input
                  type="text"
                  placeholder="Telegram channel (optional)"
                  value={feedForm.telegram_channel}
                  onChange={(e) => setFeedForm({ ...feedForm, telegram_channel: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
                <select
                  value={feedForm.feed_type}
                  onChange={(e) => setFeedForm({ ...feedForm, feed_type: e.target.value })}
                  className="w-full px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                >
                  <option value="rss">RSS</option>
                  <option value="atom">Atom</option>
                  <option value="telegram">Telegram</option>
                </select>
                <button
                  onClick={addFeed}
                  className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Add Feed
                </button>
              </div>

              <ul className="space-y-1">
                {feeds.map((feed) => (
                  <li key={feed.id} className="flex items-center justify-between p-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{feed.title}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {feed.feed_url || feed.telegram_channel || 'No URL'}
                      </div>
                      {feed.last_fetched_at && (
                        <div className="text-xs text-gray-400">
                          Last fetch: {new Date(feed.last_fetched_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => fetchSingleFeed(feed.id)}
                        className="text-green-600 hover:text-green-800 text-xs px-1"
                        title="Fetch now"
                      >
                        fetch
                      </button>
                      <button
                        onClick={() => deleteFeed(feed.id)}
                        className="text-red-500 hover:text-red-700 text-xs px-1"
                      >
                        del
                      </button>
                    </div>
                  </li>
                ))}
                {feeds.length === 0 && (
                  <p className="text-gray-400 text-sm italic">No feeds yet</p>
                )}
              </ul>
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">Select a block first</p>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-6 border dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Settings</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Retention (days)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-20 px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
              />
              <button
                onClick={saveRetention}
                disabled={savingSettings}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <button
              onClick={runCleanup}
              disabled={cleaningUp}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              {cleaningUp ? 'Cleaning...' : 'Run Cleanup Now'}
            </button>
          </div>
          {stats && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total items: <span className="font-medium text-gray-700 dark:text-gray-300">{stats.total_items}</span>
              {stats.oldest && (
                <> &middot; Oldest: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(stats.oldest).toLocaleDateString()}</span></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
