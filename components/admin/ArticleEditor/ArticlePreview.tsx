'use client';

import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { useState } from 'react';
import { marked } from 'marked';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸', color: 'blue' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱', color: 'green' }
];

interface ArticlePreviewProps {
  article?: Article | null;
}

export default function ArticlePreview({ article }: ArticlePreviewProps) {
  const [activeView, setActiveView] = useState<'split' | 'single'>('split');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'pl'>('en');
  const { setActiveTab, selectArticle, removeJobFromQueue, addActivity } = useAdminStore();
  
  // Обработчик публикации
  const handlePublish = async () => {
    if (!article) return;
    
    const toastId = toast.loading(`📤 Publishing "${article.title.substring(0, 40)}..."`);
    
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish-article',
          articleId: article.id,
          article: article
        })
      });

      const result = await response.json();
      
      if (result.success) {
        removeJobFromQueue(article.id);
        addActivity({
          type: 'article_published',
          message: `Article successfully published: ${article.title}`,
          url: result.url || `/en/article/${article.id}`
        });
        toast.success(`✅ "${article.title.substring(0, 40)}..." published!`, { id: toastId });
      } else {
        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      console.error('❌ Publication failed:', error);
      toast.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };
  
  // Обработчик редактирования
  const handleEdit = () => {
    if (!article) return;
    setActiveTab('editor');
    selectArticle(article);
  };
  
  // Обработчик регенерации переводов
  const handleRegenerateTranslations = async () => {
    toast.loading('🔄 Translation regeneration coming soon!', { duration: 2000 });
  };
  
  if (!article) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Article Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select an article from the parsing queue to preview and edit
          </p>
        </div>
      </div>
    );
  }

  const getArticleContent = (lang: 'ru' | 'en' | 'pl') => {
    if (lang === 'ru') {
      return {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt
      };
    }
    return article.translations[lang] || null;
  };

  const getLanguageColor = (lang: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    };
    const langConfig = LANGUAGES.find(l => l.code === lang);
    return colors[langConfig?.color as keyof typeof colors] || colors.blue;
  };

  const renderLanguageColumn = (lang: 'en' | 'pl') => {
    const langConfig = LANGUAGES.find(l => l.code === lang);
    const content = getArticleContent(lang);
    const hasTranslation = lang === 'en' || Boolean(content);

    return (
      <div className={`flex-1 min-w-0 ${activeView === 'single' && selectedLanguage !== lang ? 'hidden' : ''}`}>
        {/* Language Header */}
        <div className={`p-4 rounded-t-lg border ${getLanguageColor(lang)} border-b-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{langConfig?.flag}</span>
              <span className="font-medium">{langConfig?.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {hasTranslation ? (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  ✅ Ready
                </span>
              ) : (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                  ⏳ Pending
                </span>
              )}
              
              {activeView === 'single' && (
                <button
                  onClick={() => setSelectedLanguage(lang)}
                  className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Select
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-b-lg p-6">
          {hasTranslation && content ? (
            <div className="space-y-4">
              {/* Featured Image */}
              {article.image && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    FEATURED IMAGE
                  </label>
                  <img
                    src={article.image}
                    alt={content.title}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
              
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  TITLE
                </label>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {content.title}
                </h3>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  EXCERPT
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {content.excerpt}
                </p>
              </div>

              {/* Content Preview */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  CONTENT PREVIEW
                </label>
                <div className="max-h-96 overflow-y-auto prose prose-sm dark:prose-invert bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div 
                    className="text-sm text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ 
                      __html: marked(content.content.slice(0, 1000) + (content.content.length > 1000 ? '\n\n...' : '')) 
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Words: ~{content.content.split(' ').length}</span>
                  <span>Chars: {content.content.length}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      useAdminStore.getState().setActiveTab('editor');
                      useAdminStore.getState().selectArticle(article);
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => {
                      const url = `/${lang}/article/${article.id}`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                  >
                    🔗 View
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">
                {lang === 'en' ? '📝' : '🔄'}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {lang === 'en' 
                  ? 'Original content will appear here'
                  : `${langConfig?.label} translation needed`
                }
              </p>
              
              {lang !== 'en' && (
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  🤖 Generate Translation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            📄 Article Preview
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {article.category} • by {article.author}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView('split')}
              className={`px-3 py-1 text-xs rounded ${
                activeView === 'split'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              🔀 Split View
            </button>
            <button
              onClick={() => setActiveView('single')}
              className={`px-3 py-1 text-xs rounded ${
                activeView === 'single'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              📱 Single View
            </button>
          </div>

          {/* Language Selector for Single View */}
          {activeView === 'single' && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'pl')}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className={`${
        activeView === 'split' 
          ? 'grid grid-cols-1 lg:grid-cols-3 gap-4' 
          : 'max-w-2xl mx-auto'
      }`}>
        {LANGUAGES.map(lang => (
          <div key={lang.code}>
            {renderLanguageColumn(lang.code as 'en' | 'pl')}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Translations: {Object.keys(article.translations || {}).length}/2 • 
            Status: {article.publishedAt ? 'Published' : 'Draft'}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleRegenerateTranslations}
              className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors text-sm"
            >
              🔄 Regenerate All Translations
            </button>
            
            <button 
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              📝 Edit Article
            </button>
            
            <button 
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
            >
              ✅ Approve & Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


