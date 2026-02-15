'use client';

import { useAdminStore } from '@/lib/stores/admin-store';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: '⏳',
    color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    progress: 0
  },
  parsing: {
    label: 'Parsing content',
    icon: '🔍',
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    progress: 25
  },
  ai_processing: {
    label: 'AI Processing',
    icon: '🤖',
    color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    progress: 50
  },
  translating: {
    label: 'Translating EN/PL',
    icon: '🌍',
    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    progress: 75
  },
  images: {
    label: 'Finding images',
    icon: '🖼️',
    color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    progress: 90
  },
  ready: {
    label: 'Ready to publish',
    icon: '✅',
    color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    progress: 100
  },
  published: {
    label: 'Published',
    icon: '📰',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    progress: 100
  },
  failed: {
    label: 'Processing failed',
    icon: '❌',
    color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    progress: 0
  }
};

export default function ParsingQueue() {
  const { parsingQueue, removeJobFromQueue, updateJobStatus, selectArticle, setActiveTab } = useAdminStore();

  const handleRetry = (jobId: string, url: string, category: string = 'tech') => {
    const isTextJob = url.startsWith('text:');
    if (isTextJob) {
      window.alert('Text/AI jobs cannot be retried from queue. Please submit again from Text Input or AI Generate.');
      return;
    }

    updateJobStatus(jobId, 'pending', 0);
    // Перезапуск парсинга
    setTimeout(() => {
      useAdminStore.getState().startParsing(jobId, url, category);
    }, 1000);
  };

  const handleView = (jobId: string) => {
    const job = parsingQueue.find((item) => item.id === jobId);
    if (!job?.article) return;
    selectArticle(job.article);
    setActiveTab('editor');
  };

  const handleRemove = (jobId: string) => {
    if (window.confirm('Remove this URL from queue?')) {
      removeJobFromQueue(jobId);
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Удаление всех failed статей
  const handleClearFailed = () => {
    const failedJobs = parsingQueue.filter(job => job.status === 'failed');
    if (failedJobs.length === 0) return;
    
    if (window.confirm(`Remove all ${failedJobs.length} failed articles from queue?`)) {
      failedJobs.forEach(job => removeJobFromQueue(job.id));
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Force retry для зависших статей
  const handleForceRetryStuck = () => {
    const stuckJobs = parsingQueue.filter(job => 
      ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status) &&
      (Date.now() - new Date(job.startTime).getTime()) > 300000 // больше 5 минут
    );
    
    if (stuckJobs.length === 0) return;
    
    if (window.confirm(`Retry ${stuckJobs.length} stuck articles?`)) {
      stuckJobs.forEach(job => {
        updateJobStatus(job.id, 'failed', 0);
        setTimeout(() => {
          const isTextJob = job.url.startsWith('text:');
          if (isTextJob) {
            // Для текстовых статей просто помечаем как failed с подробным сообщением
            updateJobStatus(job.id, 'failed', 0);
            // Добавляем сообщение об ошибке через activity
              useAdminStore.getState().addActivity({
                type: 'parsing_failed',
                message: `Text article stuck for more than 5 minutes: ${job.url.replace('text:', '')}`,
                url: job.url
              });
          } else {
            handleRetry(job.id, job.url);
          }
        }, 1000);
      });
    }
  };

  if (parsingQueue.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Parsing queue is empty
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Add article URLs for automatic processing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            📊 Parsing Queue
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {parsingQueue.length} URLs processing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="text-right mr-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Active: {parsingQueue.filter(job => ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status)).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Ready: {parsingQueue.filter(job => job.status === 'ready').length}
            </div>
          </div>
          
          {/* ✅ НОВЫЕ КНОПКИ УПРАВЛЕНИЯ */}
          <div className="flex items-center gap-2">
            {/* Clear Failed Button */}
            {parsingQueue.filter(job => job.status === 'failed').length > 0 && (
              <button
                onClick={handleClearFailed}
                className="px-3 py-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-800 transition-colors flex items-center gap-1"
                title={`Remove all ${parsingQueue.filter(job => job.status === 'failed').length} failed articles`}
              >
                🗑️ Clear Failed
              </button>
            )}
            
            {/* Force Retry Stuck Button */}
            {parsingQueue.filter(job => 
              ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status) &&
              (Date.now() - new Date(job.startTime).getTime()) > 300000
            ).length > 0 && (
              <button
                onClick={handleForceRetryStuck}
                className="px-3 py-2 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors flex items-center gap-1"
                title="Retry stuck articles (>5 min)"
              >
                🔄 Fix Stuck
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {parsingQueue.map((job) => {
          const statusConfig = STATUS_CONFIG[job.status];
          const isTextJob = job.url.startsWith('text:');
          const sourceLabel = (() => {
            if (isTextJob) return 'Text / AI Input';
            try {
              return new URL(job.url).hostname;
            } catch {
              return 'Unknown source';
            }
          })();
          const timeAgo = formatDistanceToNow(new Date(job.startTime), { 
            addSuffix: true, 
            locale: enUS 
          });

          return (
            <div
              key={job.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{statusConfig.icon}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {timeAgo}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-900 dark:text-white font-medium truncate mb-1">
                    {sourceLabel}
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {job.url}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {job.status === 'failed' && !isTextJob && (
                    <button
                      onClick={() => handleRetry(job.id, job.url)}
                      className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                      title="Retry"
                    >
                      🔄 Retry
                    </button>
                  )}
                  
                  {job.status === 'ready' && (
                    <button
                      onClick={() => handleView(job.id)}
                      className="px-3 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                      title="View result"
                    >
                      👁️ View
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemove(job.id)}
                    className="px-3 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      job.status === 'failed' 
                        ? 'bg-red-500' 
                        : job.status === 'ready' || job.status === 'published'
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Progress: {job.progress}%</span>
                  {job.endTime && (
                    <span>
                      Completed in {Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s
                    </span>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {job.status === 'failed' && job.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {job.error}
                  </div>
                </div>
              )}

              {/* Article Preview */}
              {job.article && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                    📄 {job.article.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {job.article.excerpt}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>🏷️ {job.article.category}</span>
                    <span>✍️ {job.article.author}</span>
                    {Object.keys(job.article.translations || {}).length > 0 && (
                      <span>🌍 +{Object.keys(job.article.translations || {}).length} translations</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Queue Actions */}
      {parsingQueue.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {parsingQueue.filter(job => job.status === 'ready').length} articles ready to publish
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const failedJobs = parsingQueue.filter(job => job.status === 'failed');
                  failedJobs
                    .filter(job => !job.url.startsWith('text:'))
                    .forEach(job => handleRetry(job.id, job.url));
                }}
                className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                disabled={!parsingQueue.some(job => job.status === 'failed' && !job.url.startsWith('text:'))}
              >
                🔄 Retry Failed
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Clear entire queue?')) {
                    parsingQueue.forEach(job => removeJobFromQueue(job.id));
                  }
                }}
                className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
