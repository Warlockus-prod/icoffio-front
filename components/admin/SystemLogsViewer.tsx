'use client';

import { useState, useEffect } from 'react';
import { SystemLog, LogLevel, LogSource } from '@/lib/system-logger';

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  byAction: Record<string, number>;
}

export default function SystemLogsViewer() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Фильтры
  const [levelFilter, setLevelFilter] = useState<LogLevel | ''>('');
  const [sourceFilter, setSourceFilter] = useState<LogSource | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoursFilter, setHoursFilter] = useState(24);
  
  // Загрузка логов
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('hours', hoursFilter.toString());
      params.set('limit', '200');
      if (levelFilter) params.set('level', levelFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/system-logs?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      }
      
      // Загружаем статистику
      const statsResponse = await fetch(`/api/system-logs?stats=true&hours=${hoursFilter}`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load system logs:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Автообновление
  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 15000); // 15 сек
      return () => clearInterval(interval);
    }
  }, [autoRefresh, levelFilter, sourceFilter, searchQuery, hoursFilter]);
  
  // Очистка старых логов
  const handleCleanup = async () => {
    if (!confirm('🗑️ Удалить логи старше 30 дней?')) return;
    
    try {
      const response = await fetch('/api/system-logs?days=30', { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Удалено ${data.deletedCount} старых логов`);
        loadLogs();
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('❌ Ошибка очистки логов');
    }
  };
  
  // Форматирование времени
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Цвета для уровней
  const getLevelStyle = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      case 'warn': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'debug': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30';
    }
  };
  
  const getLevelEmoji = (level: LogLevel) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🟢';
      case 'debug': return '⚪';
      default: return '⚪';
    }
  };
  
  // Иконки для источников
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'api': return '🌐';
      case 'telegram': return '🤖';
      case 'admin': return '👤';
      case 'frontend': return '🖥️';
      case 'system': return '⚙️';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header со статистикой */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🔍 System Logs <span className="text-sm font-normal text-gray-500">(Supabase)</span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Централизованное логирование для диагностики ошибок
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (15s)
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last: {lastRefresh.toLocaleTimeString('ru-RU')}
              </div>
            </div>
            <button
              onClick={loadLogs}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
        </div>
        
        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total ({hoursFilter}h)</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-red-500">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.byLevel.error || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">🔴 Errors</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.byLevel.warn || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">🟡 Warnings</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.byLevel.info || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">🟢 Info</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.bySource.telegram || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">🤖 Telegram</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.bySource.api || 0}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">🌐 API</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🔍 Filters
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Levels</option>
              <option value="error">🔴 Error</option>
              <option value="warn">🟡 Warning</option>
              <option value="info">🟢 Info</option>
              <option value="debug">⚪ Debug</option>
            </select>
          </div>
          
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as LogSource | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Sources</option>
              <option value="api">🌐 API</option>
              <option value="telegram">🤖 Telegram</option>
              <option value="admin">👤 Admin</option>
              <option value="frontend">🖥️ Frontend</option>
              <option value="system">⚙️ System</option>
            </select>
          </div>
          
          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period</label>
            <select
              value={hoursFilter}
              onChange={(e) => setHoursFilter(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>
          
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in messages..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setLevelFilter('');
                setSourceFilter('');
                setSearchQuery('');
                setHoursFilter(24);
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleCleanup}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
              title="Delete logs older than 30 days"
            >
              🗑️ Cleanup
            </button>
          </div>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-white">
            📋 Logs ({logs.length})
          </h4>
          {isLoading && (
            <span className="text-sm text-gray-500 animate-pulse">Loading...</span>
          )}
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    log.level === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {formatTime(log.created_at || '')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelStyle(log.level)}`}>
                      {getLevelEmoji(log.level)} {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      {getSourceIcon(log.source)} {log.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                    {log.action || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="max-w-md truncate" title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No logs found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {levelFilter || sourceFilter || searchQuery
                  ? 'Try adjusting your filters'
                  : 'System logs will appear here when actions are performed'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getLevelEmoji(selectedLog.level)} Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-70px)]">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timestamp</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{formatTime(selectedLog.created_at || '')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Level</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelStyle(selectedLog.level)}`}>
                      {selectedLog.level.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
                    <p className="text-sm text-gray-900 dark:text-white">{getSourceIcon(selectedLog.source)} {selectedLog.source}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Action</label>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedLog.action || '-'}</p>
                  </div>
                </div>
                
                {/* Message */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Message</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedLog.message}</p>
                </div>
                
                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Metadata</label>
                    <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Stack Trace */}
                {selectedLog.stack_trace && (
                  <div>
                    <label className="block text-xs font-medium text-red-500 mb-2">🔴 Stack Trace</label>
                    <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg overflow-x-auto border border-red-200 dark:border-red-800">
{selectedLog.stack_trace}
                    </pre>
                  </div>
                )}
                
                {/* Additional Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {selectedLog.user_name && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">User</label>
                      <p className="text-gray-900 dark:text-white">{selectedLog.user_name}</p>
                    </div>
                  )}
                  {selectedLog.endpoint && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Endpoint</label>
                      <p className="text-gray-900 dark:text-white font-mono text-xs">{selectedLog.endpoint}</p>
                    </div>
                  )}
                  {selectedLog.request_id && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Request ID</label>
                      <p className="text-gray-900 dark:text-white font-mono text-xs">{selectedLog.request_id}</p>
                    </div>
                  )}
                  {selectedLog.duration_ms && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Duration</label>
                      <p className="text-gray-900 dark:text-white">{selectedLog.duration_ms}ms</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

