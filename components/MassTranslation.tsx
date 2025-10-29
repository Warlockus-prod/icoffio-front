'use client'

import { useState, useEffect } from 'react';

interface Article {
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  categories: { nodes: { name: string }[] };
}

interface TranslationResult {
  original: Article;
  translations: Record<string, any>;
  success: boolean;
  error?: string;
}

export function MassTranslation() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [currentArticle, setCurrentArticle] = useState('');

  // Загрузка статей
  const loadArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wordpress-articles');
      const data = await response.json();
      if (data.success) {
        setArticles(data.articles);
        setSelectedArticles(data.articles.map((a: Article) => a.slug)); // Выбрать все
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
    setLoading(false);
  };

  // Массовый перевод
  const startTranslation = async () => {
    const articlesToTranslate = articles.filter(a => selectedArticles.includes(a.slug));
    
    if (articlesToTranslate.length === 0) {
      alert('Выберите статьи для перевода!');
      return;
    }

    setTranslating(true);
    setProgress({ current: 0, total: articlesToTranslate.length });
    setResults([]);

    for (let i = 0; i < articlesToTranslate.length; i++) {
      const article = articlesToTranslate[i];
      setCurrentArticle(article.title);
      setProgress({ current: i + 1, total: articlesToTranslate.length });

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'translate-article',
            content: {
              title: article.title,
              excerpt: article.excerpt || '',
              body: article.content || ''
            }
          })
        });

        const translationData = await response.json();
        
        setResults(prev => [...prev, {
          original: article,
          translations: translationData.translations || {},
          success: translationData.success || false,
          error: translationData.error
        }]);

      } catch (error) {
        setResults(prev => [...prev, {
          original: article,
          translations: {},
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }

      // Пауза между запросами для стабильности
      if (i < articlesToTranslate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setTranslating(false);
    setCurrentArticle('');
  };

  // Экспорт результатов
  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `icoffio-translations-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadArticles();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8">
        
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🌍 Массовый Автоперевод
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Переводим все статьи WordPress на 4 языка через OpenAI GPT-4o-mini
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-600">{articles.length}</div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Всего статей</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">{selectedArticles.length}</div>
            <div className="text-xs text-green-700 dark:text-green-300">Выбрано</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-600">4</div>
            <div className="text-xs text-purple-700 dark:text-purple-300">Языка</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-orange-600">{results.length}</div>
            <div className="text-xs text-orange-700 dark:text-orange-300">Переведено</div>
          </div>
        </div>

        {/* Управление */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <button
            onClick={loadArticles}
            disabled={loading || translating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {loading ? '🔄 Загружаем...' : '📊 Загрузить статьи'}
          </button>
          
          <button
            onClick={startTranslation}
            disabled={translating || selectedArticles.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {translating ? `🔄 Переводим ${progress.current}/${progress.total}...` : `🌍 Перевести ${selectedArticles.length} статей`}
          </button>

          {results.length > 0 && (
            <button
              onClick={exportResults}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              💾 Скачать результаты
            </button>
          )}
        </div>

        {/* Прогресс */}
        {translating && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Прогресс перевода</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress.current}/{progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
              </span>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="text-sm text-center text-gray-600 dark:text-gray-400">
              📝 Переводим: <strong>{currentArticle}</strong>
            </div>
          </div>
        )}

        {/* Превью результатов */}
        {results.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">🎉 Превью переводов:</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.slice(0, 3).map((result, i) => (
                <div key={i} className="border dark:border-gray-600 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📰 {result.original.title}</h4>
                  {result.success ? (
                    <div className="space-y-2 text-sm">
                      <div>🇵🇱 <strong>PL:</strong> {result.translations.pl?.title}</div>
                      <div>🇩🇪 <strong>DE:</strong> {result.translations.de?.title}</div>
                      <div>🇷🇴 <strong>RO:</strong> {result.translations.ro?.title}</div>
                      <div>🇨🇿 <strong>CS:</strong> {result.translations.cs?.title}</div>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">❌ Ошибка: {result.error}</div>
                  )}
                </div>
              ))}
              {results.length > 3 && (
                <div className="text-center text-gray-500 text-sm">
                  ... и еще {results.length - 3} переведенных статей
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}













