'use client';

import { useState, useEffect } from 'react';
import { adminLogger, LogEntry, LogFilter } from '@/lib/admin-logger';
import SystemLogsViewer from './SystemLogsViewer';

type LogsTab = 'local' | 'system';

export default function LogsViewer() {
  const [activeTab, setActiveTab] = useState<LogsTab>('system'); // По умолчанию системные
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>({});
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Загрузка логов
  const loadLogs = () => {
    setIsLoading(true);
    try {
      const filteredLogs = adminLogger.getLogs(filter);
      setLogs(filteredLogs.slice(0, 200)); // Показываем только последние 200
      setStats(adminLogger.getStats());
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Автообновление логов
  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 10000); // Обновляем каждые 10 сек
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh]);

  // Форматирование времени
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  // Получение цвета для уровня лога
  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warn': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'debug': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Получение иконки для категории
  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'api': return '🌐';
      case 'ui': return '🖥️';
      case 'parsing': return '🔍';
      case 'translation': return '🌍';
      case 'system': return '⚙️';
      case 'user': return '👤';
      default: return '📄';
    }
  };

  // Экспорт логов
  const handleExport = () => {
    try {
      const exported = adminLogger.exportLogs(filter);
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `icoffio_admin_logs_${new Date().toISOString().split('T')[0]}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      adminLogger.userAction('logs_exported', { filter, filename, logsCount: logs.length });
      alert(`📥 Логи успешно экспортированы!\n\nФайл: ${filename}\nКоличество логов: ${logs.length}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Log export failed. Please try again.');
    }
  };

  // Очистка логов
  const handleClear = () => {
    if (window.confirm('⚠️ Вы действительно хотите очистить ВСЕ логи?\n\nВнимание: Это действие НЕЛЬЗЯ отменить!\nВсе данные диагностики будут удалены безвозвратно.\n\nПродолжить?')) {
      adminLogger.clearLogs();
      loadLogs();
      alert('✅ Все логи успешно очищены!');
    }
  };

  // Tabs Component
  const TabButton = ({ tab, label, icon }: { tab: LogsTab; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
        activeTab === tab
          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-blue-500'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <TabButton tab="system" label="System Logs (Supabase)" icon="🔍" />
        <TabButton tab="local" label="Local Logs (Browser)" icon="💻" />
      </div>
      
      {/* System Logs Tab */}
      {activeTab === 'system' && <SystemLogsViewer />}
      
      {/* Local Logs Tab */}
      {activeTab === 'local' && (
        <>
      {/* Header с статистикой */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Admin Logs & Diagnostics
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
                onClick={loadLogs}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '🔄' : '↻'} Refresh
              </button>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Logs</div>
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
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.errors24h}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Errors 24h</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.byCategory.api}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">API Calls</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              📥 Export Logs
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={() => {
                // Генерируем тестовые логи для всех уровней и категорий
                adminLogger.warn('ui', 'test_warning', 'Test warning log for UI category', { test: true });
                adminLogger.info('translation', 'test_translation', 'Test translation log', { from: 'en', to: 'pl' });
                adminLogger.error('system', 'test_error', 'Test system error', { critical: true }, new Error('Test error'));
                adminLogger.debug('ui', 'test_debug', 'Test debug UI log', { component: 'LogsViewer' });
                loadLogs();
                alert('🧪 Тестовые логи созданы!\n\nДобавлены логи для:\n- Warning UI\n- Translation Info\n- System Error\n- UI Debug');
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              🧪 Generate Test Logs
            </button>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">🔍 Filters</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
            <select
              value={filter.level?.[0] || ''}
              onChange={(e) => setFilter(prev => ({
                ...prev,
                level: e.target.value ? [e.target.value as LogEntry['level']] : undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Levels</option>
              <option value="error">❌ Error</option>
              <option value="warn">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="debug">🐛 Debug</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              value={filter.category?.[0] || ''}
              onChange={(e) => setFilter(prev => ({
                ...prev,
                category: e.target.value ? [e.target.value as LogEntry['category']] : undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              <option value="api">🌐 API</option>
              <option value="ui">🖥️ UI</option>
              <option value="parsing">🔍 Parsing</option>
              <option value="translation">🌍 Translation</option>
              <option value="system">⚙️ System</option>
              <option value="user">👤 User</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filter.search || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value || undefined }))}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Clear Filters */}
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

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">
            📋 Recent Logs ({logs.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
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
                  onClick={() => {
                    console.log('Row clicked:', log.id);
                    setSelectedLog(log);
                  }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  title="Click to view details"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {formatTime(log.timestamp)}
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
                    <div className="max-w-md truncate">
                      {log.message}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No logs found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or perform some actions to generate logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                    <p className={`text-sm font-medium ${getLevelColor(selectedLog.level)}`}>{selectedLog.level.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{getCategoryIcon(selectedLog.category)} {selectedLog.category}</p>
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

                {selectedLog.details && (
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
                      <p className="text-sm font-medium text-red-900 dark:text-red-200">{selectedLog.error.name}: {selectedLog.error.message}</p>
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
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
