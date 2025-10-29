'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

const CATEGORIES = [
  { id: 'ai', label: 'AI & Machine Learning', icon: '🤖', color: 'blue' },
  { id: 'apple', label: 'Apple & iOS', icon: '🍎', color: 'gray' },
  { id: 'tech', label: 'Technology', icon: '⚙️', color: 'green' },
  { id: 'digital', label: 'Digital & Trends', icon: '📱', color: 'purple' }
];

export default function URLInput() {
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tech');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addUrlToQueue, parsingQueue } = useAdminStore();

  // URL валидация
  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  // Обработка изменения URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);
    
    if (inputUrl && !validateUrl(inputUrl)) {
      setValidationError('Введите корректный URL (https://example.com)');
    } else {
      setValidationError('');
    }
  };

  // Проверка доступности URL
  const checkUrlAvailability = async (inputUrl: string): Promise<boolean> => {
    try {
      setIsValidating(true);
      // Простая проверка через fetch с timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`/api/check-url?url=${encodeURIComponent(inputUrl)}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('URL availability check failed:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || !validateUrl(url)) {
      setValidationError('Введите корректный URL');
      return;
    }

    // Проверка на дублирование
    const isDuplicate = parsingQueue.some(job => job.url === url);
    if (isDuplicate) {
      setValidationError('Этот URL уже добавлен в очередь');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Проверка доступности URL (опционально)
      const isAvailable = await checkUrlAvailability(url);
      if (!isAvailable) {
        setValidationError('URL недоступен или не отвечает');
        return;
      }

      // Добавление в очередь
      addUrlToQueue(url, selectedCategory);
      
      // Очистка формы
      setUrl('');
      setValidationError('');
      
    } catch (error) {
      setValidationError('Ошибка при добавлении URL');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
    };
    return colors[category as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          🔗 Add URL to Parsing Queue
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Добавьте URL статьи для автоматического парсинга, перевода и обработки
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Article URL
          </label>
          <div className="relative">
            <input
              id="url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com/article"
              className={`w-full px-4 py-3 pl-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white ${
                validationError
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              disabled={isSubmitting}
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {isValidating ? (
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              ) : (
                <span className="text-gray-400">🌐</span>
              )}
            </div>
          </div>
          
          {validationError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <span>⚠️</span>
              {validationError}
            </p>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Category
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedCategory === category.id
                    ? getCategoryColor(category.color)
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {parsingQueue.length > 0 && (
              <span>📊 {parsingQueue.length} URL в очереди</span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!url || !!validationError || isSubmitting || isValidating}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Add to Queue</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Add Examples */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          💡 Quick Add Examples:
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {[
            'https://openai.com/news/',
            'https://wylsa.com/tech-news/',
            'https://techcrunch.com/category/artificial-intelligence/'
          ].map((exampleUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setUrl(exampleUrl)}
              className="text-left text-xs text-blue-600 dark:text-blue-400 hover:underline p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {exampleUrl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}








