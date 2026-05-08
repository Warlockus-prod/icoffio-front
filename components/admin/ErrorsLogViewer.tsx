'use client';

/**
 * ErrorsLogViewer — admin dashboard for the self-hosted error log (replaces Sentry UI).
 *
 * Reads from /api/admin/errors-log (admin-only). Pollable refresh + filter
 * by level / source.
 */

import { useEffect, useState, useCallback } from 'react';

interface ErrorEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  source: string;
  message: string;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  request_path: string | null;
  request_method: string | null;
  user_email: string | null;
  user_ip: string | null;
  created_at: string;
}

interface Stats24h {
  info: number;
  warn: number;
  error: number;
  critical: number;
}

const LEVEL_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  critical: 'bg-red-600 text-white',
};

const LEVEL_DOT: Record<string, string> = {
  info: 'bg-blue-500',
  warn: 'bg-yellow-500',
  error: 'bg-red-500',
  critical: 'bg-red-700',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function ErrorsLogViewer() {
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [stats, setStats] = useState<Stats24h>({ info: 0, warn: 0, error: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLevel) params.set('level', filterLevel);
      if (filterSource.trim()) params.set('source', filterSource.trim());
      params.set('limit', '200');
      const r = await fetch(`/api/admin/errors-log?${params.toString()}`);
      if (!r.ok) {
        if (r.status === 401) setPurgeMessage('Unauthorized — session expired');
        return;
      }
      const data = await r.json();
      setEntries(data.entries || []);
      setStats(data.stats24h || { info: 0, warn: 0, error: 0, critical: 0 });
    } catch (e: any) {
      setPurgeMessage(`Failed to load: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePurge = async (olderThanDays: number) => {
    if (!confirm(`Delete error entries older than ${olderThanDays} days?`)) return;
    setPurging(true);
    setPurgeMessage('');
    try {
      const r = await fetch(`/api/admin/errors-log?olderThanDays=${olderThanDays}`, {
        method: 'DELETE',
      });
      const data = await r.json();
      if (data.ok) {
        setPurgeMessage(`Deleted ${data.deleted} entries.`);
        void load();
      } else {
        setPurgeMessage(`Purge failed: ${data.error}`);
      }
    } catch (e: any) {
      setPurgeMessage(`Purge failed: ${e?.message ?? e}`);
    } finally {
      setPurging(false);
    }
  };

  const uniqueSources = Array.from(new Set(entries.map((e) => e.source))).sort();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🚨 Error Log
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Self-hosted application errors (replaces Sentry).
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? '⏳ Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stats 24h */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(['critical', 'error', 'warn', 'info'] as const).map((lvl) => (
          <div
            key={lvl}
            className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block w-2 h-2 rounded-full ${LEVEL_DOT[lvl]}`} />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{lvl}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats[lvl]}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">last 24h</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Level</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Source</label>
          <input
            type="text"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            placeholder="e.g. admin-auth"
            list="errors-sources-list"
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-48"
          />
          <datalist id="errors-sources-list">
            {uniqueSources.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => handlePurge(30)}
            disabled={purging}
            className="px-3 py-1.5 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 disabled:opacity-50"
          >
            🗑️ Purge {'>'} 30d
          </button>
          <button
            onClick={() => handlePurge(7)}
            disabled={purging}
            className="px-3 py-1.5 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 disabled:opacity-50"
          >
            🗑️ Purge {'>'} 7d
          </button>
        </div>
      </div>

      {purgeMessage && (
        <div className="mb-3 p-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded">
          {purgeMessage}
        </div>
      )}

      {/* Entries list */}
      {loading && entries.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          ✅ No errors {filterLevel || filterSource ? 'matching filters' : 'in log'}.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 flex items-start gap-3"
              >
                <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${LEVEL_BADGE[e.level]}`}>
                  {e.level}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{e.source}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">{fmtTime(e.created_at)}</span>
                    {e.request_path && (
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-500">
                        {e.request_method || ''} {e.request_path}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                    {e.message}
                  </div>
                </div>
                <span className="shrink-0 text-gray-400 text-sm">
                  {expandedId === e.id ? '▾' : '▸'}
                </span>
              </button>

              {expandedId === e.id && (
                <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {e.stack && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stack:</div>
                      <pre className="text-xs font-mono text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {e.stack}
                      </pre>
                    </div>
                  )}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Metadata:</div>
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  {(e.user_email || e.user_ip) && (
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                      {e.user_email && <span className="mr-3">👤 {e.user_email}</span>}
                      {e.user_ip && <span>🌐 {e.user_ip}</span>}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Logged at {new Date(e.created_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
