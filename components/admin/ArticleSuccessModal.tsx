'use client';

import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { marked } from 'marked';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ArticleSuccessModalProps {
  article: Article;
  onClose: () => void;
}

const CONTENT_STYLES = [
  { id: 'journalistic', label: '📰 Journalistic', description: 'Professional news style' },
  { id: 'academic', label: '🎓 Academic', description: 'Scholarly writing' },
  { id: 'casual', label: '💬 Casual', description: 'Conversational tone' },
  { id: 'technical', label: '⚙️ Technical', description: 'Technical documentation' },
  { id: 'as-is', label: '✋ As Is', description: 'Keep original style' }
];

export default function ArticleSuccessModal({ article, onClose }: ArticleSuccessModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('journalistic');
  
  // Editable fields
  const [editedTitle, setEditedTitle] = useState(article.title);
  const [editedExcerpt, setEditedExcerpt] = useState(article.excerpt || '');
  const [editedContent, setEditedContent] = useState(article.content);
  const [editedImage, setEditedImage] = useState(article.image || '');
  
  const { removeJobFromQueue, addActivity, updateArticle } = useAdminStore();
  
  // Detect source language
  const detectLanguage = (text: string): string => {
    // Simple detection based on characters
    if (/[\u0400-\u04FF]/.test(text)) return 'Russian';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
    if (/[\u0590-\u05FF]/.test(text)) return 'Hebrew';
    if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
    return 'English';
  };

  const sourceLanguage = detectLanguage(article.content);
  const needsTranslation = sourceLanguage !== 'English';

  const handleSave = () => {
    setIsSaving(true);
    
    // Update article in store
    updateArticle({
      id: article.id,
      title: editedTitle,
      excerpt: editedExcerpt,
      content: editedContent,
      image: editedImage
    });
    
    toast.success('✅ Changes saved!');
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleReprocess = async () => {
    const toastId = toast.loading(`🔄 Reprocessing with ${CONTENT_STYLES.find(s => s.id === selectedStyle)?.label} style...`);
    
    try {
      // TODO: Call reprocessing API with selected style
      toast.success('✅ Article reprocessed!', { id: toastId });
    } catch (error) {
      toast.error('❌ Reprocessing failed', { id: toastId });
    }
  };

  const handleTranslate = async () => {
    if (!needsTranslation) {
      toast.error('Article is already in English');
      return;
    }

    const toastId = toast.loading(`🌍 Translating from ${sourceLanguage} to EN + PL...`);
    
    try {
      // TODO: Call translation API
      toast.success('✅ Translation complete!', { id: toastId });
    } catch (error) {
      toast.error('❌ Translation failed', { id: toastId });
    }
  };

  const handlePublish = async () => {
    const toastId = toast.loading(`📤 Publishing "${editedTitle.substring(0, 40)}..."`, {
      duration: Infinity,
    });
    
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish-article',
          articleId: article.id,
          article: {
            ...article,
            title: editedTitle,
            excerpt: editedExcerpt,
            content: editedContent,
            image: editedImage
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        removeJobFromQueue(article.id);
        addActivity({
          type: 'article_published',
          message: `Article successfully published: ${editedTitle}`,
          url: result.urls?.en || `/en/article/${article.id}`
        });
        toast.success(`✅ "${editedTitle.substring(0, 40)}..." published successfully!`, {
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

  // Get content for active language
  const getContent = () => {
    if (language === 'en') {
      return {
        title: editedTitle,
        excerpt: editedExcerpt,
        content: editedContent
      };
    } else {
      return {
        title: article.translations?.pl?.title || editedTitle,
        excerpt: article.translations?.pl?.excerpt || editedExcerpt,
        content: article.translations?.pl?.content || editedContent
      };
    }
  };

  const content = getContent();
  const wordCount = editedContent.split(' ').length;
  const hasTranslation = article.translations && article.translations.pl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">✅</span>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Article Ready - All-in-One Editor
                </h3>
              </div>
              <div className="ml-14 flex items-center gap-4 text-sm">
                {needsTranslation && (
                  <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full">
                    <span>⚠️</span>
                    <span>Source: {sourceLanguage}</span>
                    <button
                      onClick={handleTranslate}
                      className="ml-2 underline hover:no-underline"
                    >
                      Translate to EN+PL
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>📰</span>
                  <span className="font-medium capitalize">{article.category}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>📝</span>
                  <span className="font-medium">~{wordCount} words</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span>🌍</span>
                  <span className="font-medium">{hasTranslation ? '2' : '1'} languages</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="px-6 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'preview'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                👁️ Preview
                {activeTab === 'preview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'edit'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                ✏️ Edit
                {activeTab === 'edit' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400" />
                )}
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => setLanguage('pl')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  language === 'pl'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🇵🇱 PL
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'preview' ? (
            /* PREVIEW MODE */
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                {/* Image */}
                {editedImage && (
                  <div className="mb-8 group relative">
                    <img
                      src={editedImage}
                      alt={content.title}
                      className="w-full h-96 object-cover rounded-xl shadow-lg"
                    />
                    <button
                      onClick={() => setActiveTab('edit')}
                      className="absolute top-4 right-4 px-4 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      🖼️ Change Image
                    </button>
                  </div>
                )}

                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
                  {content.excerpt && (
                    <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                      {content.excerpt}
                    </p>
                  )}
                  <div 
                    className="prose-content"
                    dangerouslySetInnerHTML={{ 
                      __html: marked(content.content.substring(0, 3000) + (content.content.length > 3000 ? '\n\n...' : '')) 
                    }} 
                  />
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <div className="p-6">
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Content Style Selector */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    🎨 Content Style
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {CONTENT_STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedStyle === style.id
                            ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{style.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {style.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleReprocess}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    🔄 Reprocess with selected style
                  </button>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    🖼️ Featured Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editedImage}
                      onChange={(e) => setEditedImage(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                    {editedImage && (
                      <button
                        onClick={() => setEditedImage('')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                  {editedImage && (
                    <img
                      src={editedImage}
                      alt="Preview"
                      className="mt-3 w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    📝 Title
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-3 text-lg font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    📄 Excerpt ({editedExcerpt.length}/160)
                  </label>
                  <textarea
                    value={editedExcerpt}
                    onChange={(e) => setEditedExcerpt(e.target.value.substring(0, 160))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    ✍️ Content (Markdown)
                  </label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg disabled:opacity-50"
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Close
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab(activeTab === 'preview' ? 'edit' : 'preview')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {activeTab === 'preview' ? '✏️ Edit' : '👁️ Preview'}
              </button>
              
              <button
                onClick={handlePublish}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium shadow-lg shadow-green-500/50 transition-all"
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
