'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import toast from 'react-hot-toast';
import RichTextEditor from '../RichTextEditor';

interface ContentEditorProps {
  article?: Article | null;
  language?: 'en' | 'pl';
}

const CATEGORIES = [
  { id: 'ai', label: 'AI & Machine Learning', icon: '🤖' },
  { id: 'apple', label: 'Apple & iOS', icon: '🍎' },
  { id: 'tech', label: 'Technology', icon: '⚙️' },
  { id: 'digital', label: 'Digital & Trends', icon: '📱' }
];

export default function ContentEditor({ article, language = 'en' }: ContentEditorProps) {
  const [editedContent, setEditedContent] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'tech',
    author: 'icoffio Editorial Team'
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [editorMode, setEditorMode] = useState<'markdown' | 'wysiwyg'>('wysiwyg'); // Default to WYSIWYG
  
  const { updateArticle } = useAdminStore();

  // Load content when article changes
  useEffect(() => {
    if (article) {
      if (language === 'en') {
        setEditedContent({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          category: article.category,
          author: article.author
        });
      } else {
        const translation = article.translations[language];
        if (translation) {
          setEditedContent({
            title: translation.title,
            content: translation.content,
            excerpt: translation.excerpt,
            category: article.category,
            author: article.author
          });
        }
      }
      setIsDirty(false);
    }
  }, [article, language]);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && article) {
      const saveTimeout = setTimeout(() => {
        saveContent();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(saveTimeout);
    }
  }, [editedContent, isDirty]);

  const handleChange = (field: keyof typeof editedContent, value: string) => {
    setEditedContent(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const saveContent = async () => {
    if (!article || !isDirty) return;

    setIsSaving(true);
    
    // Show loading toast
    const toastId = toast.loading('💾 Saving changes...');
    
    try {
      if (language === 'en') {
        // Update original content
        updateArticle({
          title: editedContent.title,
          content: editedContent.content,
          excerpt: editedContent.excerpt,
          category: editedContent.category,
          author: editedContent.author
        });
      } else {
        // Update translation
        const updatedTranslations = {
          ...article.translations,
          [language]: {
            title: editedContent.title,
            content: editedContent.content,
            excerpt: editedContent.excerpt
          }
        };
        updateArticle({ translations: updatedTranslations });
      }
      
      setLastSaved(new Date());
      setIsDirty(false);
      
      // Success toast
      toast.success('✅ Changes saved successfully!', { id: toastId });
    } catch (error) {
      console.error('Save failed:', error);
      // Error toast
      toast.error('❌ Failed to save changes', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const getCharCount = (text: string) => text.length;
  const getReadingTime = (text: string) => Math.max(1, Math.round(getWordCount(text) / 200));

  if (!article) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">✏️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Article Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select an article to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              ✏️ Content Editor
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Language: {language === 'en' ? '🇺🇸 English' : '🇵🇱 Polish'}</span>
              <span>•</span>
              <span>
                {isDirty ? (
                  <span className="text-yellow-600 dark:text-yellow-400">● Unsaved changes</span>
                ) : lastSaved ? (
                  <span className="text-green-600 dark:text-green-400">✓ Saved {lastSaved.toLocaleTimeString()}</span>
                ) : (
                  <span>Ready to edit</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Editor Mode Toggle (только в Edit режиме) */}
            {!isPreview && (
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setEditorMode('wysiwyg')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    editorMode === 'wysiwyg'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  ✨ WYSIWYG
                </button>
                <button
                  onClick={() => setEditorMode('markdown')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    editorMode === 'markdown'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  📝 Markdown
                </button>
              </div>
            )}
            
            {/* Save Button */}
            <button
              onClick={saveContent}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  💾 Save
                </>
              )}
            </button>

            {/* Preview Toggle */}
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                isPreview
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isPreview ? '✏️ Edit' : '👁️ Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-6">
        {isPreview ? (
          /* Preview Mode */
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                {CATEGORIES.find(cat => cat.id === editedContent.category)?.icon}
                <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {CATEGORIES.find(cat => cat.id === editedContent.category)?.label}
                </span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {editedContent.title}
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 italic">
                {editedContent.excerpt}
              </p>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                By {editedContent.author} • {getReadingTime(editedContent.content)} min read
              </div>
            </div>
            
            <div className="prose-content">
              {editedContent.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editedContent.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter article title..."
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {editedContent.title.length} characters
              </div>
            </div>

            {/* Category and Author (only for English/original) */}
            {language === 'en' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={editedContent.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={editedContent.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Author name"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                  />
                </div>
              </div>
            )}

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Excerpt
                <span className={`ml-2 text-xs font-normal ${
                  editedContent.excerpt.length <= 150 
                    ? 'text-green-600 dark:text-green-400' 
                    : editedContent.excerpt.length <= 160 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  ({editedContent.excerpt.length}/160)
                </span>
              </label>
              <textarea
                value={editedContent.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                placeholder="Brief summary of the article..."
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Ideal length: 150-160 characters for SEO
                </span>
                {editedContent.excerpt.length > 150 && editedContent.excerpt.length <= 160 && (
                  <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    ⚠️ Close to limit
                  </span>
                )}
                {editedContent.excerpt.length === 160 && (
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                    🚫 Maximum reached
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content {editorMode === 'wysiwyg' ? '(WYSIWYG Editor)' : '(Markdown)'}
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editorMode === 'wysiwyg' ? 'Rich text editing with formatting' : 'Plain text / Markdown'}
                </span>
              </div>
              
              {editorMode === 'wysiwyg' ? (
                <RichTextEditor
                  content={editedContent.content}
                  onChange={(content) => handleChange('content', content)}
                  placeholder="Write your article content here..."
                  className="min-h-[400px]"
                />
              ) : (
                <textarea
                  value={editedContent.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-vertical"
                  placeholder="Write your article content here..."
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                />
              )}
              
              {/* Content Stats */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span>Words: {getWordCount(editedContent.content.replace(/<[^>]*>/g, ''))}</span>
                  <span>Characters: {getCharCount(editedContent.content)}</span>
                  <span>Reading time: ~{getReadingTime(editedContent.content.replace(/<[^>]*>/g, ''))} min</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {editorMode === 'wysiwyg' ? (
                    <span className="text-green-600 dark:text-green-400">✨ Visual editor active</span>
                  ) : (
                    <button className="hover:text-gray-700 dark:hover:text-gray-300">
                      📝 Formatting Help
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Editing original content' : `Editing ${language.toUpperCase()} translation`}
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors text-sm">
              🤖 AI Improve
            </button>
            
            <button
              onClick={saveContent}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              💾 Save Changes
            </button>
            
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
              ✅ Approve & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




