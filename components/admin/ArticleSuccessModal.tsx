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
  const [activeTab, setActiveTab] = useState<'en' | 'pl'>('en');
  const { removeJobFromQueue, addActivity } = useAdminStore();
  
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
        removeJobFromQueue(article.id);
        addActivity({
          type: 'article_published',
          message: `Article successfully published: ${article.title}`,
          url: result.urls?.en || `/en/article/${article.id}`
        });
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

  // Get content for active tab
  const getContent = () => {
    if (activeTab === 'en') {
      return {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content
      };
    } else {
      return {
        title: article.translations?.pl?.title || article.title,
        excerpt: article.translations?.pl?.excerpt || article.excerpt,
        content: article.translations?.pl?.content || article.content
      };
    }
  };

  const content = getContent();
  const wordCount = content.content.split(' ').length;
  const hasTranslation = article.translations && article.translations.pl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">✅</span>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Article Ready!
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm ml-14">
                Your article has been successfully processed with AI translation and images
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 ml-14 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="text-lg">📰</span>
              <span className="font-medium capitalize">{article.category}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="text-lg">📝</span>
              <span className="font-medium">~{wordCount} words</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="text-lg">🌍</span>
              <span className="font-medium">{hasTranslation ? '2' : '1'} languages</span>
            </div>
            {article.image && (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <span className="text-lg">🖼️</span>
                <span className="font-medium">Image ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Language Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('en')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'en'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span>
                  <span>English</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                    Original
                  </span>
                </div>
                {activeTab === 'en' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('pl')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'pl'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇵🇱</span>
                  <span>Polski</span>
                  {hasTranslation && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                      AI Translated
                    </span>
                  )}
                </div>
                {activeTab === 'pl' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Featured Image */}
            {article.image && (
              <div className="mb-8 group">
                <img
                  src={article.image}
                  alt={content.title}
                  className="w-full h-96 object-cover rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]"
                />
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                {content.title}
              </h1>
              
              {content.excerpt && (
                <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {content.excerpt}
                </p>
              )}
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-8 flex items-center gap-4">
                <span>✍️ By {article.author || 'AI Editorial Team'}</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              
              <div 
                className="prose-content text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ 
                  __html: marked(content.content.substring(0, 2000) + (content.content.length > 2000 ? '\n\n...' : '')) 
                }} 
              />

              {content.content.length > 2000 && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    📖 Preview showing first 2000 characters. Full article contains ~{wordCount} words.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Queue Button */}
            <button
              onClick={handleGoToQueue}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
            >
              📤 Go to Publishing Queue
            </button>

            {/* Right: Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={onClose}
                className="flex-1 md:flex-none px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                Close
              </button>
              
              <button
                onClick={handleEdit}
                className="flex-1 md:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/50"
              >
                ✏️ Edit Article
              </button>
              
              <button
                onClick={handlePublish}
                className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-green-500/50"
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
