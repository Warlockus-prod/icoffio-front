'use client';

import { useState } from 'react';

interface ArticleFormData {
  url: string;
  title: string;
  content: string;
  category: 'ai' | 'apple' | 'games' | 'tech';
  mode: 'url' | 'manual';
}

interface GeneratedArticle {
  title: string;
  excerpt: string;
  slug: string;
  category: {
    name: string;
    slug: string;
  } | string;
  languages: number;
}

export default function AddArticleForm() {
  const [formData, setFormData] = useState<ArticleFormData>({
    url: '',
    title: '',
    content: '',
    category: 'tech',
    mode: 'url'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedArticle | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const categories = [
    { value: 'ai', label: '🤖 AI & Machine Learning', color: 'blue' },
    { value: 'apple', label: '🍎 Apple & iOS', color: 'gray' },
    { value: 'games', label: '🎮 Games & Gaming', color: 'purple' },
    { value: 'tech', label: '⚡ Technology', color: 'green' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);
    setProgress(0);

    try {
      // Имитация прогресса
      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 90 ? prev + 10 : prev);
      }, 1000);

      const payload = formData.mode === 'url' 
        ? { 
            action: 'create-from-url',
            url: formData.url,
            category: formData.category
          }
        : { 
            action: 'create-from-text',
            title: formData.title, 
            content: formData.content, 
            category: formData.category 
          };

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка генерации статьи');
      }

      setResult(data.data.stats);
      
      // Сброс формы
      setFormData({
        url: '',
        title: '',
        content: '',
        category: 'tech',
        mode: 'url'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Переключатель режимов */}
      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, mode: 'url' }))}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            formData.mode === 'url'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📎 Из URL
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, mode: 'manual' }))}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            formData.mode === 'manual'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✍️ Ручной ввод
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formData.mode === 'url' ? (
          <div className="space-y-4 transition-all duration-200">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL статьи
              </label>
              <input
                type="url"
                id="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required={formData.mode === 'url'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Введите URL статьи для автоматического извлечения и адаптации контента
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 transition-all duration-200">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Заголовок статьи
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Введите заголовок статьи"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required={formData.mode === 'manual'}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Содержание статьи
              </label>
              <textarea
                id="content"
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Введите или вставьте содержание статьи..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                required={formData.mode === 'manual'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Контент будет адаптирован под стиль icoffio и переведен на все языки
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Категория
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Прогресс-бар */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Обработка статьи...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {progress < 30 && "📖 Анализируем контент..."}
              {progress >= 30 && progress < 60 && "🤖 Генерируем адаптированную версию..."}
              {progress >= 60 && progress < 90 && "🌐 Переводим на 5 языков..."}
              {progress >= 90 && "✅ Финализируем..."}
            </div>
          </div>
        )}

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } text-white`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Генерируем статью...
            </span>
          ) : (
            '🚀 Создать и опубликовать статью'
          )}
        </button>
      </form>

      {/* Результат */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 transition-all duration-300 ease-in-out">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-green-900 mb-2">
                Статья успешно создана!
              </h3>
              <div className="space-y-1 text-sm text-green-800">
                <p><strong>Заголовок:</strong> {result.title}</p>
                <p><strong>Категория:</strong> {typeof result.category === 'string' ? result.category : result.category?.name}</p>
                <p><strong>Языков:</strong> {result.languages}</p>
                <p><strong>URL:</strong> <code>/article/{result.slug}</code></p>
              </div>
              
              {/* Дополнительная информация о процессе */}
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <h4 className="text-sm font-semibold text-green-900 mb-2">
                  📊 Детали обработки:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                  <div>🤖 Контент улучшен</div>
                  <div>🖼️ Изображение создано</div>
                  <div>🌍 Переводы готовы</div>
                  <div>💾 Локально сохранено</div>
                </div>
              </div>
              
              {/* Ссылки на языковые версии */}
              <div className="mt-3">
                <p className="text-xs text-green-700 mb-2">
                  🔗 Доступно на языках:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['ru', 'en', 'pl', 'de', 'ro', 'cs'].slice(0, result.languages).map(lang => (
                    <span
                      key={lang}
                      className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium"
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-green-600 mt-3">
                ✅ Статья сохранена локально и готова к просмотру
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 transition-all duration-300 ease-in-out">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Ошибка создания статьи
              </h3>
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                Попробуйте еще раз или обратитесь к администратору
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Информация о процессе */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          ℹ️ Как это работает
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start">
            <span className="mr-2">1️⃣</span>
            <span>ИИ анализирует исходный контент и адаптирует его под стиль icoffio</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">2️⃣</span>
            <span>Автоматически подбираются релевантные изображения</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">3️⃣</span>
            <span>Статья переводится на 5 языков: EN, PL, DE, RO, CS</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">4️⃣</span>
            <span>Контент оптимизируется для SEO и публикуется на сайте</span>
          </div>
        </div>
      </div>
    </div>
  );
}