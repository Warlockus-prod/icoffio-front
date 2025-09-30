'use client';

import { useState } from 'react';
import URLInput from './URLParser/URLInput';
import TextInput from './URLParser/TextInput';
import ParsingQueue from './URLParser/ParsingQueue';
import { useAdminStore } from '@/lib/stores/admin-store';

export default function URLParser() {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const { parsingQueue, statistics } = useAdminStore();
  
  const activeJobs = parsingQueue.filter(job => 
    ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status)
  ).length;
  
  const readyJobs = parsingQueue.filter(job => job.status === 'ready').length;
  const failedJobs = parsingQueue.filter(job => job.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-lg">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {parsingQueue.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total in Queue
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 dark:text-yellow-400 text-lg">🔄</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processing
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {readyJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Ready to Publish
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {failedJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Failed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Article</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose how you want to create a new article</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setInputMode('url')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                inputMode === 'url'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>🔗</span>
              From URL
            </button>
            
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                inputMode === 'text'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>✏️</span>
              From Text
            </button>
          </div>
        </div>
      </div>

      {/* Input Form */}
      {inputMode === 'url' ? <URLInput /> : <TextInput />}

      {/* Processing Info */}
      {activeJobs > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
              Active Processing
            </h4>
          </div>
          
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
            {activeJobs} статей обрабатываются в данный момент. Среднее время обработки: ~{statistics.averageProcessingTime || 60}с
          </p>
          
          <div className="flex flex-wrap gap-2">
            {parsingQueue
              .filter(job => ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status))
              .slice(0, 3)
              .map(job => (
                <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {new URL(job.url).hostname}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {job.status === 'parsing' && '🔍 Извлечение контента'}
                    {job.status === 'ai_processing' && '🤖 ИИ обработка'}
                    {job.status === 'translating' && '🌍 Перевод EN/PL'}
                    {job.status === 'images' && '🖼️ Подбор изображений'}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            
            {activeJobs > 3 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm flex items-center justify-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  +{activeJobs - 3} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {readyJobs > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                🎉 Articles Ready!
              </h4>
              <p className="text-green-700 dark:text-green-300 text-sm">
                {readyJobs} статей успешно обработаны и готовы к публикации
              </p>
            </div>
            
            <button 
              onClick={() => useAdminStore.getState().setActiveTab('queue')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              📤 Go to Publishing Queue
            </button>
          </div>
        </div>
      )}

      {/* Main Queue */}
      <ParsingQueue />

      {/* Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          💡 Tips & Best Practices
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🎯</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  Выбирайте правильную категорию
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Это поможет ИИ лучше обработать контент
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  Используйте прямые ссылки
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Избегайте redirect ссылок и shortened URLs
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔍</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  Проверьте доступность
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Убедитесь что статья открывается без регистрации
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-lg">🚀</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  Обрабатывайте пачками
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Добавляйте до 5 URL одновременно для оптимальной скорости
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


