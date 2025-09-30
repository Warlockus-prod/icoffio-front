'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import ArticlePreview from './ArticleEditor/ArticlePreview';
import TranslationPanel from './ArticleEditor/TranslationPanel';
import ContentEditor from './ArticleEditor/ContentEditor';

export default function ArticleEditor() {
  const { selectedArticle, parsingQueue, selectArticle } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'translations'>('preview');
  const [selectedLanguage, setSelectedLanguage] = useState<'ru' | 'en' | 'pl'>('ru');
  
  // Get articles ready for editing
  const readyArticles = parsingQueue.filter(job => job.status === 'ready' && job.article);

  // Auto-select first ready article if none selected
  useEffect(() => {
    if (!selectedArticle && readyArticles.length > 0) {
      selectArticle(readyArticles[0].article!);
    }
  }, [readyArticles, selectedArticle, selectArticle]);

  const tabs = [
    { id: 'preview', label: 'Preview', icon: '👁️', description: 'View article in all languages' },
    { id: 'editor', label: 'Editor', icon: '✏️', description: 'Edit content and metadata' },
    { id: 'translations', label: 'Translations', icon: '🌍', description: 'Manage EN/PL translations' }
  ];

  const languages = [
    { code: 'ru', label: 'Russian', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pl', label: 'Polish', flag: '🇵🇱' }
  ];

  return (
    <div className="space-y-6">
      {/* Article Selector */}
      {readyArticles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                📚 Select Article to Edit
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {readyArticles.length} articles ready for editing
              </p>
            </div>
            
            <select
              value={selectedArticle?.id || ''}
              onChange={(e) => {
                const article = readyArticles.find(job => job.article?.id === e.target.value)?.article;
                if (article) selectArticle(article);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[200px]"
            >
              {readyArticles.map((job) => (
                <option key={job.article!.id} value={job.article!.id}>
                  {job.article!.title.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* No Articles Available */}
      {readyArticles.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Articles Ready for Editing
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Add URLs to the parsing queue to start creating articles
            </p>
            <button 
              onClick={() => useAdminStore.getState().setActiveTab('parser')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              🔗 Go to URL Parser
            </button>
          </div>
        </div>
      )}

      {/* Main Editor Interface */}
      {selectedArticle && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-600">
              <nav className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    <div className="text-xs text-center mt-1 opacity-70">
                      {tab.description}
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Language Selector for Editor Tab */}
            {activeTab === 'editor' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-750">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Edit Language:
                  </span>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code as any)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                  
                  {selectedLanguage !== 'ru' && !selectedArticle.translations[selectedLanguage] && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">
                      ⚠️ Translation not available
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'preview' && (
              <ArticlePreview article={selectedArticle} />
            )}
            
            {activeTab === 'editor' && (
              <ContentEditor article={selectedArticle} language={selectedLanguage} />
            )}
            
            {activeTab === 'translations' && (
              <TranslationPanel article={selectedArticle} />
            )}
          </div>

          {/* Article Actions Footer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Status:</span> {selectedArticle.publishedAt ? 'Published' : 'Draft'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Translations:</span> {Object.keys(selectedArticle.translations).length}/2
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Category:</span> {selectedArticle.category}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm">
                  💾 Save Draft
                </button>
                
                <button 
                  onClick={() => useAdminStore.getState().setActiveTab('queue')}
                  className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors text-sm"
                >
                  📤 Go to Publishing Queue
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      console.log('🚀 Publishing article:', selectedArticle.title);
                      
                      const response = await fetch('/api/articles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'publish-article',
                          articleId: selectedArticle.id,
                          article: selectedArticle
                        })
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        alert(`✅ Статья "${selectedArticle.title}" успешно опубликована!`);
                      } else {
                        throw new Error(result.error || 'Publication failed');
                      }
                    } catch (error) {
                      console.error('❌ Publication failed:', error);
                      alert(`❌ Ошибка публикации: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                >
                  🚀 Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {readyArticles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-lg">📄</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {readyArticles.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Ready Articles
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-lg">🌍</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {readyArticles.reduce((sum, job) => sum + Object.keys(job.article?.translations || {}).length, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Translations
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 text-lg">✏️</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {readyArticles.filter(job => !job.article?.publishedAt).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Drafts
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 text-lg">📊</span>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {Math.round(readyArticles.reduce((sum, job) => sum + (job.article?.content.split(' ').length || 0), 0) / (readyArticles.length || 1))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Words
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


