'use client';

import { useState } from 'react';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';

interface TranslationPanelProps {
  article?: Article | null;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸', description: 'For global reach' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱', description: 'For Polish market' }
];

export default function TranslationPanel({ article }: TranslationPanelProps) {
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const [translationProgress, setTranslationProgress] = useState<Record<string, number>>({});
  const { updateArticle } = useAdminStore();

  const generateTranslation = async (languageCode: 'en' | 'pl') => {
    if (!article) return;

    setIsTranslating(prev => ({ ...prev, [languageCode]: true }));
    setTranslationProgress(prev => ({ ...prev, [languageCode]: 0 }));

    try {
      // Симуляция прогресса
      const progressInterval = setInterval(() => {
        setTranslationProgress(prev => ({
          ...prev,
          [languageCode]: Math.min(prev[languageCode] + 10, 90)
        }));
      }, 200);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt
          },
          targetLanguage: languageCode,
          sourceLanguage: 'en'
        })
      });

      const result = await response.json();
      clearInterval(progressInterval);

      if (result.success) {
        setTranslationProgress(prev => ({ ...prev, [languageCode]: 100 }));
        
        // Обновляем статью с новым переводом
        const updatedTranslations = {
          ...article.translations,
          [languageCode]: {
            title: result.translation.title,
            content: result.translation.content,
            excerpt: result.translation.excerpt
          }
        };

        updateArticle({ translations: updatedTranslations });
        
        setTimeout(() => {
          setTranslationProgress(prev => ({ ...prev, [languageCode]: 0 }));
        }, 2000);
      } else {
        throw new Error(result.error || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationProgress(prev => ({ ...prev, [languageCode]: 0 }));
    } finally {
      setIsTranslating(prev => ({ ...prev, [languageCode]: false }));
    }
  };

  const regenerateTranslation = (languageCode: 'en' | 'pl') => {
    if (window.confirm(`Regenerate ${languageCode.toUpperCase()} translation? This will overwrite the current translation.`)) {
      generateTranslation(languageCode);
    }
  };

  if (!article) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">🌍</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Article Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select an article to manage translations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          🌍 Translation Manager
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Generate and manage EN/PL translations using OpenAI GPT-4
        </p>
      </div>

      {/* Original Article Info */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">🇷🇺</span>
          <div>
            <div className="font-medium text-blue-900 dark:text-blue-200">Original (Russian)</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{article.title}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm text-blue-700 dark:text-blue-300">
          <div>
            <span className="font-medium">Words:</span> {article.content.split(' ').length}
          </div>
          <div>
            <span className="font-medium">Characters:</span> {article.content.length.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Category:</span> {article.category}
          </div>
        </div>
      </div>

      {/* Translation Languages */}
      <div className="space-y-4">
        {LANGUAGES.map((lang) => {
          const hasTranslation = Boolean(article.translations[lang.code as keyof typeof article.translations]);
          const isGenerating = isTranslating[lang.code];
          const progress = translationProgress[lang.code] || 0;

          return (
            <div key={lang.code} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {lang.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {lang.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasTranslation ? (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                      ✅ Ready
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Translation Progress */}
              {isGenerating && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      🤖 Generating translation...
                    </span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Translation Preview */}
              {hasTranslation && article.translations[lang.code as keyof typeof article.translations] && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Translated Title:
                    </span>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {article.translations[lang.code as keyof typeof article.translations]!.title}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Excerpt Preview:
                    </span>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {article.translations[lang.code as keyof typeof article.translations]!.excerpt}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!hasTranslation ? (
                  <button
                    onClick={() => generateTranslation(lang.code as 'en' | 'pl')}
                    disabled={isGenerating}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        🤖 Generate Translation
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => regenerateTranslation(lang.code as 'en' | 'pl')}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      🔄 Regenerate
                    </button>
                    
                    <button className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors text-sm">
                      ✏️ Edit Translation
                    </button>
                    
                    <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors text-sm">
                      👁️ Preview
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(article.translations || {}).length}/2 translations completed
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                LANGUAGES.forEach(lang => {
                  if (!article.translations[lang.code as keyof typeof article.translations]) {
                    generateTranslation(lang.code as 'en' | 'pl');
                  }
                });
              }}
              disabled={Object.values(isTranslating).some(Boolean)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Generate All Missing
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('Regenerate ALL translations? This will overwrite existing translations.')) {
                  LANGUAGES.forEach(lang => {
                    generateTranslation(lang.code as 'en' | 'pl');
                  });
                }
              }}
              disabled={Object.values(isTranslating).some(Boolean)}
              className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              🔄 Regenerate All
            </button>
          </div>
        </div>
      </div>

      {/* Translation Tips */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          💡 Translation Tips
        </h4>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>• AI переводы учитывают контекст и техническую терминологию</div>
          <div>• Переводы можно редактировать после генерации</div>
          <div>• Для лучшего качества убедитесь что оригинал написан корректно</div>
        </div>
      </div>
    </div>
  );
}

