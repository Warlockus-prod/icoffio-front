'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

interface TextInputProps {
  onSubmit?: () => void;
}

export default function TextInput({ onSubmit }: TextInputProps) {
  const { addTextToQueue, parsingQueue } = useAdminStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'ai', name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'apple', name: 'Apple & iOS', icon: '🍎' },
    { id: 'tech', name: 'Technology', icon: '⚙️' },
    { id: 'digital', name: 'Digital & Trends', icon: '📱' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await addTextToQueue(title.trim(), content.trim(), category || 'tech');
      
      // Очищаем форму после успешной отправки
      setTitle('');
      setContent('');
      setCategory('');
      
      onSubmit?.();
    } catch (error) {
      console.error('Error adding text to queue:', error);
      // TODO: показать пользователю ошибку
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = title.trim() && content.trim();
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>✏️</span>
          Create Article from Text
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Введите заголовок и содержимое статьи для автоматической обработки и перевода
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="article-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Title
          </label>
          <div className="relative">
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Введите заголовок статьи..."
              disabled={isSubmitting}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="text-lg">📝</span>
            </div>
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <label htmlFor="article-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Content
          </label>
          <div className="relative">
            <textarea
              id="article-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-500 dark:placeholder:text-gray-400
                       resize-y min-h-[200px]"
              placeholder="Введите содержимое статьи. ИИ улучшит текст, создаст переводы и подберет изображения..."
              disabled={isSubmitting}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {wordCount} words
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  category === cat.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                disabled={isSubmitting}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all ${
              isFormValid && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Create Article</span>
              </>
            )}
          </button>

          {parsingQueue.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>📊</span>
              <span>{parsingQueue.length} article{parsingQueue.length !== 1 ? 's' : ''} in queue</span>
            </div>
          )}
        </div>
      </form>

      {/* Writing Tips */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>💡</span>
          Writing Tips
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>Заголовок:</strong> Делайте его кратким и информативным (до 70 символов)</li>
          <li>• <strong>Содержимое:</strong> Пишите структурированно с абзацами для лучшего восприятия</li>
          <li>• <strong>ИИ улучшения:</strong> Система автоматически улучшит стиль и добавит SEO оптимизацию</li>
          <li>• <strong>Переводы:</strong> Автоматически создадутся версии на английском и польском языках</li>
          <li>• <strong>Изображения:</strong> ИИ подберет релевантные изображения из Unsplash или создаст новые</li>
        </ul>
      </div>
    </div>
  );
}
