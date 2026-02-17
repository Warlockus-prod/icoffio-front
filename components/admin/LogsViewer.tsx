'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminLogger, type LogEntry, type LogFilter } from '@/lib/admin-logger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogSource = 'client' | 'server';
type UiCategory = 'api' | 'ui' | 'parsing' | 'queue' | 'translation' | 'system' | 'user' | 'telegram' | 'other';

interface UnifiedLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: UiCategory;
  action: string;
  message: string;
  source: LogSource;
  details?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

interface ServerLogApiEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  action: string;
  message: string;
  details?: Record<string, unknown>;
}

interface UnifiedFilter {
  level?: LogLevel;
  category?: UiCategory;
  search?: string;
}

const LOCAL_CATEGORIES: UiCategory[] = ['api', 'ui', 'parsing', 'translation', 'system', 'user'];
const FILTER_CATEGORY_OPTIONS: UiCategory[] = [
  'api',
  'ui',
  'parsing',
  'queue',
  'translation',
  'system',
  'user',
  'telegram',
];

function mapServerCategory(category: string): UiCategory {
  if (category === 'parser') return 'parsing';
  if (category === 'queue') return 'queue';
  if (category === 'api') return 'api';
  if (category === 'system') return 'system';
  if (category === 'telegram') return 'telegram';
  if (category === 'translation') return 'translation';
  if (category === 'ui') return 'ui';
  if (category === 'user') return 'user';
  return 'other';
}

function toServerCategory(category?: UiCategory): string | undefined {
  if (!category) return undefined;
  if (category === 'parsing') return 'parser';
  if (category === 'queue') return 'queue';
  if (category === 'telegram') return 'telegram';
  if (category === 'api') return 'api';
  if (category === 'system') return 'system';
  if (category === 'other') return undefined;
  return category;
}

function mapClientLog(log: LogEntry): UnifiedLogEntry {
  return {
    id: `client_${log.id}`,
    timestamp: new Date(log.timestamp),
    level: log.level,
    category: log.category,
    action: log.action,
    message: log.message,
    source: 'client',
    details: log.details,
    error: log.error,
    duration: log.duration,
    sessionId: log.sessionId,
    url: log.url,
    userAgent: log.userAgent,
  };
}

function mapServerLog(log: ServerLogApiEntry): UnifiedLogEntry {
  return {
    id: `server_${log.id}`,
    timestamp: new Date(log.timestamp),
    level: log.level,
    category: mapServerCategory(log.category),
    action: log.action,
    message: log.message,
    source: 'server',
    details: log.details,
  };
}

export default function LogsViewer() {
  const [clientLogs, setClientLogs] = useState<UnifiedLogEntry[]>([]);
  const [serverLogs, setServerLogs] = useState<UnifiedLogEntry[]>([]);
  const [filter, setFilter] = useState<UnifiedFilter>({});
  const [sourceFilter, setSourceFilter] = useState<'all' | 'client' | 'server'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UnifiedLogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [serverError, setServerError] = useState<string | null>(null);

  const logs = useMemo(() => {
    const merged =
      sourceFilter === 'client'
        ? [...clientLogs]
        : sourceFilter === 'server'
          ? [...serverLogs]
          : [...clientLogs, ...serverLogs];

    return merged
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 300);
  }, [clientLogs, serverLogs, sourceFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const base = {
      total: logs.length,
      byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
      bySource: { client: 0, server: 0 },
      errors24h: 0,
    };

    logs.forEach((log) => {
      base.byLevel[log.level] += 1;
      base.bySource[log.source] += 1;
      if (log.level === 'error' && log.timestamp.getTime() >= dayAgo) {
        base.errors24h += 1;
      }
    });

    return base;
  }, [logs]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const clientFilter: LogFilter = {
        level: filter.level ? [filter.level] : undefined,
        category:
          filter.category && LOCAL_CATEGORIES.includes(filter.category)
            ? [filter.category as LogEntry['category']]
            : undefined,
        search: filter.search,
      };

      const local = adminLogger.getLogs(clientFilter).slice(0, 200).map(mapClientLog);
      setClientLogs(local);

      const params = new URLSearchParams({ limit: '250' });
      if (filter.level) params.set('level', filter.level);
      const serverCategory = toServerCategory(filter.category);
      if (serverCategory) params.set('category', serverCategory);
      if (filter.search) params.set('search', filter.search);

      const response = await fetch(`/api/admin/system-logs?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const payload = await response.json();
        const serverList = Array.isArray(payload?.logs) ? payload.logs : [];
        setServerLogs(serverList.map(mapServerLog));
        setServerError(null);
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          if (payload?.error) errorMessage = payload.error;
        } catch {
          // Ignore JSON parse error and keep generic HTTP message.
        }
        setServerLogs([]);
        setServerError(errorMessage);
      }

      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to load logs:', error);
      setServerError(error?.message || 'Failed to load server logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void loadLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, filter.level, filter.category, filter.search]);

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  };

  const getLevelColor = (level: string) => {
    if (level === 'error') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (level === 'warn') return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (level === 'info') return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'api') return '🌐';
    if (category === 'ui') return '🖥️';
    if (category === 'parsing') return '🔍';
    if (category === 'queue') return '📤';
    if (category === 'translation') return '🌍';
    if (category === 'system') return '⚙️';
    if (category === 'user') return '👤';
    if (category === 'telegram') return '📱';
    return '📄';
  };

  const handleExport = () => {
    try {
      const payload = JSON.stringify(logs, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `icoffio_system_logs_${new Date().toISOString().split('T')[0]}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      adminLogger.userAction('logs_exported', { sourceFilter, filter, logsCount: logs.length });
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Failed to export logs');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear logs for selected source? This action cannot be undone.')) return;

    try {
      let clearedClient = false;
      let clearedServer = false;

      if (sourceFilter === 'all' || sourceFilter === 'client') {
        adminLogger.clearLogs();
        clearedClient = true;
      }

      if (sourceFilter === 'all' || sourceFilter === 'server') {
        const response = await fetch('/api/admin/system-logs', {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          clearedServer = true;
        } else {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || `Failed to clear server logs (HTTP ${response.status})`);
        }
      }

      await loadLogs();
      alert(
        `✅ Logs cleared (${[
          clearedClient ? 'client' : null,
          clearedServer ? 'server' : null,
        ]
          .filter(Boolean)
          .join(' + ')})`
      );
    } catch (error: any) {
      console.error('Clear logs failed:', error);
      alert(`❌ ${error?.message || 'Failed to clear logs'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📊 System Logs (Client + Server)
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (10s)
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last: {lastRefresh.toLocaleTimeString('ru-RU')}
              </div>
            </div>
            <button
              onClick={() => void loadLogs()}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ Server logs unavailable: {serverError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.byLevel.error}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Errors</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.byLevel.warn}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byLevel.info}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Info</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.bySource.client}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Client</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.bySource.server}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Server</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.errors24h}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Errors 24h</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            📥 Export Logs
          </button>
          <button
            onClick={() => void handleClear()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            🗑️ Clear Logs
          </button>
          <button
            onClick={() => {
              adminLogger.warn('ui', 'test_warning', 'Test warning log from LogsViewer', { test: true });
              adminLogger.error('system', 'test_error', 'Test system error from LogsViewer', { test: true }, new Error('Test error'));
              void loadLogs();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            🧪 Generate Client Test Logs
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">🔍 Filters</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'all' | 'client' | 'server')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All sources</option>
              <option value="client">Client only</option>
              <option value="server">Server only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
            <select
              value={filter.level || ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, level: (e.target.value || undefined) as LogLevel | undefined }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All levels</option>
              <option value="error">❌ Error</option>
              <option value="warn">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="debug">🐛 Debug</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              value={filter.category || ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, category: (e.target.value || undefined) as UiCategory | undefined }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All categories</option>
              {FILTER_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filter.search || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value || undefined }))}
              placeholder="Search action/message/details..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilter({})}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">📋 Recent Logs ({logs.length})</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.source === 'server'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                      }`}
                    >
                      {log.source.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                      {getCategoryIcon(log.category)}
                      {log.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    <div className="max-w-md truncate">{log.message}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No logs found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting filters or generate test logs.</p>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.timestamp.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.source}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                    <p className={`text-sm font-medium ${getLevelColor(selectedLog.level)}`}>{selectedLog.level.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getCategoryIcon(selectedLog.category)} {selectedLog.category}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.action}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.message}</p>
                </div>

                {!!selectedLog.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.error && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 dark:text-red-400">Error</label>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">
                        {selectedLog.error.name}: {selectedLog.error.message}
                      </p>
                      {selectedLog.error.stack && (
                        <pre className="text-xs text-red-700 dark:text-red-300 mt-2 overflow-x-auto">
                          {selectedLog.error.stack}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {selectedLog.duration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.duration}ms</p>
                  </div>
                )}

                {selectedLog.url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 break-all">{selectedLog.url}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
