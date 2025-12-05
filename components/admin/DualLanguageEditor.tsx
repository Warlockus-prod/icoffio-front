'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import toast from 'react-hot-toast';
import RichTextEditor from './RichTextEditor';

/**
 * 🌍 DUAL-LANGUAGE EDITOR v8.2.0
 * 
 * Показывает EN и PL версии статьи РЯДОМ для одновременного редактирования.
 * Используется на первом этапе после парсинга.
 */

const CATEGORIES = [
  { id: 'ai', label: 'AI & Machine Learning', icon: '🤖' },
  { id: 'apple', label: 'Apple & iOS', icon: '🍎' },
  { id: 'tech', label: 'Technology', icon: '⚙️' },
  { id: 'digital', label: 'Digital & Trends', icon: '📱' }
];

interface DualLanguageEditorProps {
  article: Article;
  onSave?: () => void;
}

interface LanguageContent {
  title: string;
  content: string;
  excerpt: string;
}

export default function DualLanguageEditor({ article, onSave }: DualLanguageEditorProps) {
  const [viewMode, setViewMode] = useState<'split' | 'en' | 'pl'>('split');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Separate state for each language
  const [enContent, setEnContent] = useState<LanguageContent>({
    title: '',
    content: '',
    excerpt: ''
  });
  
  const [plContent, setPlContent] = useState<LanguageContent>({
    title: '',
    content: '',
    excerpt: ''
  });
  
  // Shared fields
  const [category, setCategory] = useState('tech');
  const [author, setAuthor] = useState('icoffio Editorial Team');
  
  const { updateArticle } = useAdminStore();

  // Load content when article changes
  useEffect(() => {
    if (article) {
      // Load English content
      if (article.translations?.en) {
        setEnContent({
          title: article.translations.en.title || article.title,
          content: article.translations.en.content || article.content,
          excerpt: article.translations.en.excerpt || article.excerpt
        });
      } else {
        setEnContent({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt
        });
      }
      
      // Load Polish content
      if (article.translations?.pl) {
        setPlContent({
          title: article.translations.pl.title,
          content: article.translations.pl.content,
          excerpt: article.translations.pl.excerpt
        });
      }
      
      setCategory(article.category || 'tech');
      setAuthor(article.author || 'icoffio Editorial Team');
      setIsDirty(false);
    }
  }, [article]);

  // Auto-save after 3 seconds of inactivity
  useEffect(() => {
    if (isDirty) {
      const saveTimeout = setTimeout(() => {
        saveContent();
      }, 3000);
      return () => clearTimeout(saveTimeout);
    }
  }, [enContent, plContent, isDirty]);

  const handleEnChange = (field: keyof LanguageContent, value: string) => {
    setEnContent(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handlePlChange = (field: keyof LanguageContent, value: string) => {
    setPlContent(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const saveContent = async () => {
    if (!isDirty) return;
    
    setIsSaving(true);
    const toastId = toast.loading('💾 Saving both languages...');
    
    try {
      updateArticle({
        title: enContent.title,
        content: enContent.content,
        excerpt: enContent.excerpt,
        category,
        author,
        translations: {
          en: { ...enContent },
          pl: { ...plContent }
        }
      });
      
      setLastSaved(new Date());
      setIsDirty(false);
      toast.success('✅ EN + PL saved!', { id: toastId });
      onSave?.();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('❌ Failed to save', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  // Render single language column
  const renderLanguageColumn = (
    lang: 'en' | 'pl',
    content: LanguageContent,
    onChange: (field: keyof LanguageContent, value: string) => void
  ) => {
    const flag = lang === 'en' ? '🇺🇸' : '🇵🇱';
    const label = lang === 'en' ? 'English' : 'Polish';
    const colorClass = lang === 'en' 
      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
      : 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20';

    return (
      <div className={`flex-1 min-w-0 ${viewMode !== 'split' && viewMode !== lang ? 'hidden' : ''}`}>
        {/* Language Header */}
        <div className={`p-3 rounded-t-lg border ${colorClass} border-b-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{flag}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{label}</span>
              {content.title && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  ✓ Ready
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getWordCount(content.content)} words
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4 bg-white dark:bg-gray-800 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
              Title
            </label>
            <input
              type="text"
              value={content.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={`Enter ${label} title...`}
              data-gramm="false"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
              Excerpt <span className={content.excerpt.length > 150 ? 'text-yellow-600' : ''}>{content.excerpt.length}/160</span>
            </label>
            <textarea
              value={content.excerpt}
              onChange={(e) => onChange('excerpt', e.target.value)}
              maxLength={160}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder={`Enter ${label} excerpt...`}
              data-gramm="false"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
              Content
            </label>
            <RichTextEditor
              content={content.content}
              onChange={(val) => onChange('content', val)}
              placeholder={`Write ${label} content...`}
              className="min-h-[300px]"
            />
          </div>
        </div>
      </div>
    );
  };

  if (!article) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
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
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🌍 Dual-Language Editor
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                (EN + PL)
              </span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isDirty ? (
                <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  Unsaved changes (auto-save in 3s)
                </span>
              ) : lastSaved ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              ) : (
                <span>Ready to edit</span>
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🔀 Split
              </button>
              <button
                onClick={() => setViewMode('en')}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  viewMode === 'en'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => setViewMode('pl')}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  viewMode === 'pl'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🇵🇱 PL
              </button>
            </div>
          </div>
        </div>

        {/* Shared Fields: Category & Author */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setIsDirty(true); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => { setAuthor(e.target.value); setIsDirty(true); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Author name"
            />
          </div>
        </div>
      </div>

      {/* Dual Content Area */}
      <div className="p-4">
        <div className={`${viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}`}>
          {renderLanguageColumn('en', enContent, handleEnChange)}
          {renderLanguageColumn('pl', plContent, handlePlChange)}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">EN:</span> {getWordCount(enContent.content)} words •
            <span className="font-medium ml-2">PL:</span> {getWordCount(plContent.content)} words
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={saveContent}
              disabled={!isDirty || isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>💾 Save Both Languages</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

