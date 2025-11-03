'use client';

import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { marked } from 'marked';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ArticleSuccessModalProps {
  article: Article;
  onClose: () => void;
}

export default function ArticleSuccessModal({ article, onClose }: ArticleSuccessModalProps) {
  const [showPreview, setShowPreview] = useState(true);
  
  const handleEdit = () => {
    useAdminStore.getState().setActiveTab('editor');
    useAdminStore.getState().selectArticle(article);
    onClose();
  };
  
  const handlePublish = async () => {
    const toastId = toast.loading(`📤 Publishing "${article.title.substring(0, 40)}..."`, {
      duration: Infinity,
    });
    
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
        toast.success(`✅ "${article.title.substring(0, 40)}..." published successfully!`, {
          id: toastId,
          duration: 4000,
        });
        onClose();
      } else {
        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      console.error('❌ Publication failed:', error);
      toast.error(`❌ Failed to publish: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
      });
    }
  };

  const handleGoToQueue = () => {
    useAdminStore.getState().setActiveTab('queue');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                🎉 Article Created Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your article has been processed and is ready for review
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showPreview ? (
            /* Preview Mode */
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {/* Featured Image */}
              {article.image && (
                <div className="mb-6">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-4">{article.excerpt}</p>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-4">
                <span>By {article.author}</span>
                <span>•</span>
                <span className="capitalize">{article.category}</span>
                <span>•</span>
                <span>{Object.keys(article.translations || {}).length + 1} languages</span>
              </div>
              
              <div 
                className="prose-content"
                dangerouslySetInnerHTML={{ 
                  __html: marked(article.content || '') 
                }} 
              />
            </div>
          ) : (
            /* Article Info */
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Article Details
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Title:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{article.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{article.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Author:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{article.author}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Languages:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {Object.keys(article.translations || {}).length + 1} (EN, PL)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Words:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    ~{article.content.split(' ').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Has Image:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {article.image ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* View Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
            >
              {showPreview ? '📊 Show Details' : '👁️ Show Preview'}
            </button>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={handleGoToQueue}
                className="flex-1 md:flex-none px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                📤 Go to Queue
              </button>
              
              <button
                onClick={handleEdit}
                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                ✏️ Edit Article
              </button>
              
              <button
                onClick={handlePublish}
                className="flex-1 md:flex-none px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                🚀 Publish Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

