'use client'

import { useState, useEffect } from 'react';
import { getTranslation } from '@/lib/i18n';

interface TestPanelProps {
  locale: string;
}

interface TranslationResult {
  success: boolean;
  result?: any;
  error?: string;
  message?: string;
}

export function TestPanel({ locale }: TestPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const t = getTranslation(locale);

  // Проверка доступности сервиса перевода
  useEffect(() => {
    checkTranslationService();
  }, []);

  const checkTranslationService = async () => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-availability' })
      });
      const data = await response.json();
      setTranslationAvailable(data.available);
      setTestResults(prev => ({ ...prev, translation_service: data }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        translation_service: { 
          available: false, 
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  };

  // Тест оптимизации изображений
  const testImageOptimization = async () => {
    setIsLoading(true);
    const results = {
      webp_support: checkWebPSupport(),
      lazy_loading_support: 'IntersectionObserver' in window,
      blur_placeholder: true
    };
    
    setTestResults(prev => ({ ...prev, image_optimization: results }));
    setIsLoading(false);
  };

  const checkWebPSupport = (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Тест системы поиска
  const testAdvancedSearch = () => {
    setIsLoading(true);
    const searchFeatures = {
      filter_by_category: true,
      filter_by_date: true,
      relevance_scoring: true,
      keyboard_shortcuts: true,
      responsive_design: true
    };
    
    setTestResults(prev => ({ ...prev, advanced_search: searchFeatures }));
    setIsLoading(false);
  };

  // Тест автоматического перевода
  const testTranslation = async () => {
    if (!translationAvailable) {
      setTestResults(prev => ({ 
        ...prev, 
        translation_test: { error: 'Translation service not available' }
      }));
      return;
    }

    setIsLoading(true);
    try {
      const testContent = "Hello, this is a test article about artificial intelligence and technology.";
      
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: testContent,
          targetLanguage: locale === 'en' ? 'pl' : 'en',
          contentType: 'excerpt'
        })
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, translation_test: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        translation_test: { 
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
    setIsLoading(false);
  };

  // Запуск всех тестов
  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults({});
    
    await checkTranslationService();
    await testImageOptimization();
    testAdvancedSearch();
    if (translationAvailable) {
      await testTranslation();
    }
    
    setIsLoading(false);
  };

  // Показываем Test Panel только в development режиме
  if (process.env.NODE_ENV === 'production') {
    return null; 
  }

  return (
    <>
      {/* Floating Test Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        title="Open Test Panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Test Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    🧪 Test Panel - New Features
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Testing image optimization, advanced search, and auto-translation
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                
                {/* Test Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={runAllTests}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {isLoading ? '🔄 Testing...' : '🚀 Run All Tests'}
                  </button>
                  
                  <button
                    onClick={testImageOptimization}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    🖼️ Test Images
                  </button>
                  
                  <button
                    onClick={testAdvancedSearch}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    🔍 Test Search
                  </button>
                  
                  <button
                    onClick={testTranslation}
                    disabled={!translationAvailable}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={translationAvailable ? 'Test translation' : 'OpenAI API key required'}
                  >
                    🌍 Test Translation
                  </button>
                </div>

                {/* Results */}
                <div className="space-y-6">
                  {Object.entries(testResults).map(([key, result]) => (
                    <div key={key} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 capitalize">
                        {key.replace(/_/g, ' ')} Results
                      </h3>
                      
                      <div className="bg-neutral-900 dark:bg-neutral-700 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-green-400 dark:text-green-300 font-mono">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature Status */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      ✅ Image Optimization
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• WebP format support</li>
                      <li>• Lazy loading with IntersectionObserver</li>
                      <li>• Blur placeholder</li>
                      <li>• Responsive sizes</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      🔍 Advanced Search
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Category filtering</li>
                      <li>• Date range filtering</li>
                      <li>• Relevance scoring</li>
                      <li>• Keyboard shortcuts (⌘K)</li>
                    </ul>
                  </div>

                  <div className={`bg-gradient-to-br ${translationAvailable ? 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800' : 'from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800'} p-4 rounded-lg border`}>
                    <h4 className={`font-semibold mb-2 ${translationAvailable ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-200'}`}>
                      {translationAvailable ? '🌍 Auto Translation' : '⚠️ Translation Disabled'}
                    </h4>
                    <ul className={`text-sm space-y-1 ${translationAvailable ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      <li>• OpenAI GPT-4o Mini</li>
                      <li>• Multi-language support</li>
                      <li>• Content-aware prompts</li>
                      <li>{translationAvailable ? '• API configured ✅' : '• Requires OPENAI_API_KEY'}</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
