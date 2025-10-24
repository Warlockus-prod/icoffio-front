'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ArticlesListSkeleton } from './LoadingStates';

interface ReadyArticle extends Article {
  parsedAt: Date;
  processingTime?: number;
  url: string;
  extractedMeta?: {
    images: number;
    words: number;
    category: string;
    tags: string[];
  };
}

export default function PublishingQueue() {
  const { parsingQueue, publishingQueue, removeJobFromQueue, updateJobStatus, addActivity } = useAdminStore();
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState<Set<string>>(new Set());
  const [previewArticle, setPreviewArticle] = useState<ReadyArticle | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'failed'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Получаем готовые к публикации статьи из parsing queue
  const readyForPublish = parsingQueue
    .filter(job => job.status === 'ready' && job.article)
    .map(job => ({
      ...job.article!,
      id: job.id, // Override с job.id для уникальности
      parsedAt: new Date(job.startTime),
      processingTime: 25000, // Примерное время парсинга 25сек
      url: job.url,
      extractedMeta: {
        images: 1,
        words: job.article!.content ? job.article!.content.split(' ').length : 0,
        category: job.article!.category || 'tech',
        tags: ['parsed', 'ready']
      }
    } as ReadyArticle));
  
  // Initial loading simulation
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const stats = {
    total: readyForPublish.length,
    selected: selectedArticles.size,
    publishing: isPublishing.size
  };

  const handleSelectAll = () => {
    if (selectedArticles.size === readyForPublish.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(readyForPublish.map(article => article.id)));
    }
  };

  const handleSelectArticle = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  const handlePublishSingle = async (article: ReadyArticle) => {
    setIsPublishing(prev => new Set([...prev, article.id]));
    
    // Show loading toast
    const toastId = toast.loading(`📤 Publishing "${article.title.substring(0, 40)}..."`, {
      duration: Infinity, // Keep until we manually dismiss
    });
    
    try {
      console.log('🚀 Publishing article:', article.title);
      
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
        // Убираем из parsing queue
        removeJobFromQueue(article.id);
        
        // Добавляем активность
        addActivity({
          type: 'article_published',
          message: `Статья успешно опубликована: ${article.title}`,
          url: result.url || article.url
        });

        console.log('✅ Article published successfully');
        
        // Success toast
        toast.success(`✅ "${article.title.substring(0, 40)}..." published successfully!`, {
          id: toastId,
          duration: 4000,
        });
      } else {
        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      console.error('❌ Publication failed:', error);
      addActivity({
        type: 'parsing_failed',
        message: `Ошибка публикации: ${article.title}`,
        url: article.url
      });
      
      // Error toast
      toast.error(`❌ Failed to publish "${article.title.substring(0, 30)}...": ${error instanceof Error ? error.message : 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setIsPublishing(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.id);
        return newSet;
      });
    }
  };

  const handlePublishSelected = async () => {
    const articlesToPublish = readyForPublish.filter(article => selectedArticles.has(article.id));
    
    // Show info toast
    toast(`📤 Publishing ${articlesToPublish.length} articles...`, {
      icon: '📊',
      duration: 3000,
    });
    
    for (const article of articlesToPublish) {
      await handlePublishSingle(article);
      // Небольшая задержка между публикациями
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setSelectedArticles(new Set());
    
    // Final success toast
    toast.success(`🎉 Successfully published ${articlesToPublish.length} articles!`, {
      duration: 5000,
    });
  };

  const handlePreview = (article: ReadyArticle) => {
    setPreviewArticle(article);
  };

  const handleClosePreview = () => {
    setPreviewArticle(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              📤 Publishing Queue
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Управление готовыми к публикации статьями
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.selected}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.publishing}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Publishing</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {readyForPublish.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedArticles.size === readyForPublish.length && readyForPublish.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Select All ({readyForPublish.length})
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePublishSelected}
                disabled={selectedArticles.size === 0 || isPublishing.size > 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
              >
                🚀 Publish Selected ({selectedArticles.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Articles List */}
      {isLoading ? (
        <ArticlesListSkeleton />
      ) : readyForPublish.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Articles Ready for Publishing
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add URLs to the parsing queue to start creating articles
          </p>
          <button 
            onClick={() => useAdminStore.getState().setActiveTab('parser')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            🔗 Go to URL Parser
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {readyForPublish.map((article) => (
            <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedArticles.has(article.id)}
                  onChange={() => handleSelectArticle(article.id)}
                  className="mt-1 rounded border-gray-300 dark:border-gray-600"
                />

                {/* Article Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 
                        className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate"
                        title={article.title}
                      >
                        {article.title}
                      </h4>
                      <p 
                        className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-2"
                        title={article.excerpt}
                      >
                        {article.excerpt}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-3 py-1 rounded-full text-xs font-medium">
                      ✅ Ready to Publish
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>Parsed {formatDistanceToNow(article.parsedAt, { addSuffix: true, locale: enUS })}</span>
                    </div>
                    {article.processingTime && (
                      <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{Math.round(article.processingTime / 1000)}s</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span>📝</span>
                      <span>{article.extractedMeta?.words} words</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🏷️</span>
                      <span>{article.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🌍</span>
                      <span>{Object.keys(article.translations || {}).length + 1} languages</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePreview(article)}
                      className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors text-sm"
                    >
                      👁️ Preview
                    </button>
                    
                    <button
                      onClick={() => useAdminStore.getState().selectArticle(article)}
                      className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors text-sm"
                    >
                      ✏️ Edit
                    </button>
                    
                    <button
                      onClick={() => handlePublishSingle(article)}
                      disabled={isPublishing.has(article.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      {isPublishing.has(article.id) ? '⏳ Publishing...' : '🚀 Publish Now'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📄 Article Preview
                </h3>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <h1>{previewArticle.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 italic">{previewArticle.excerpt}</p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  By {previewArticle.author} • {previewArticle.category}
                </div>
                <div dangerouslySetInnerHTML={{ __html: (previewArticle.content || '').replace(/\n/g, '<br>') }} />
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handlePublishSingle(previewArticle);
                    handleClosePreview();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  🚀 Publish This Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
