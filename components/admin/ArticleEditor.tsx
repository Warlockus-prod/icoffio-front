'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';
import { localArticleStorage } from '@/lib/local-article-storage';
import toast from 'react-hot-toast';
import ArticlePreview from './ArticleEditor/ArticlePreview';
import TranslationPanel from './ArticleEditor/TranslationPanel';
import ContentEditor from './ArticleEditor/ContentEditor';
import ImageMetadataEditor from './ImageMetadataEditor';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export default function ArticleEditor() {
  const { selectedArticle, parsingQueue, selectArticle, updateArticle } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'translations' | 'images'>('preview');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'pl'>('en');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [resumeDraft, setResumeDraft] = useState<{ id: string; title: string } | null>(null);
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const selectedArticleRef = useRef(selectedArticle);
  const parsingQueueRef = useRef(parsingQueue);

  // Keep refs in sync for use in beforeunload
  useEffect(() => {
    selectedArticleRef.current = selectedArticle;
    parsingQueueRef.current = parsingQueue;
  }, [selectedArticle, parsingQueue]);

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const saveDraftSilently = useCallback((showToast = false) => {
    const article = selectedArticleRef.current;
    const queue = parsingQueueRef.current;
    if (!article) return false;

    const sourceJob = queue.find((job) => job.article?.id === article.id);
    const sourceType = sourceJob?.url?.startsWith('text:') ? 'text' : 'url';
    const translations = Object.entries(article.translations || {}).reduce(
      (acc, [lang, translation]) => {
        if (!translation) return acc;
        acc[lang] = {
          title: translation.title,
          content: translation.content,
          excerpt: translation.excerpt,
          slug: toSlug(translation.title || `${article.title}-${lang}`),
        };
        return acc;
      },
      {} as Record<string, { title: string; content: string; excerpt: string; slug: string }>
    );

    const saved = localArticleStorage.saveArticle({
      id: article.id,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      slug: toSlug(article.title),
      category: article.category || 'tech',
      author: article.author || 'AI Assistant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      image: article.image,
      status: 'draft',
      translations,
      source: {
        type: sourceType,
        originalUrl: sourceJob?.url,
      },
    });

    if (saved) {
      setLastAutoSave(new Date());
      if (showToast) toast.success('Draft saved');
    } else if (showToast) {
      toast.error('Failed to save draft');
    }
    return saved;
  }, []);

  const handleSaveDraft = () => saveDraftSilently(true);

  // Auto-save on beforeunload (page close/refresh)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedArticleRef.current) {
        saveDraftSilently(false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveDraftSilently]);

  // Auto-save interval (every 30s while editing)
  useEffect(() => {
    if (!selectedArticle) return;
    const interval = setInterval(() => {
      saveDraftSilently(false);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedArticle, saveDraftSilently]);

  // Check for resumable draft on mount
  useEffect(() => {
    const drafts = localArticleStorage.getArticlesByStatus('draft');
    if (drafts.length > 0 && !selectedArticle) {
      const latest = drafts.sort((a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )[0];
      setResumeDraft({ id: latest.id, title: latest.title });
    }
  }, []);

  const handleResumeDraft = () => {
    if (!resumeDraft) return;
    const stored = localArticleStorage.getArticle(resumeDraft.id);
    if (stored) {
      selectArticle({
        id: stored.id,
        title: stored.title,
        content: stored.content,
        excerpt: stored.excerpt,
        category: stored.category,
        author: stored.author,
        image: stored.image,
        translations: stored.translations as any,
      });
      toast.success('Draft restored');
    }
    setResumeDraft(null);
  };
  
  // Get articles ready for editing (from queue + local storage)
  const readyArticles = parsingQueue.filter(job => job.status === 'ready' && job.article);
  
  // Получаем статьи из локального хранилища
  const [localArticles, setLocalArticles] = useState(() => {
    const stored = localArticleStorage.getArticlesByStatus('ready');
    return stored.map(article => ({
      id: article.id,
      url: article.source.originalUrl || `local:${article.title}`,
      status: 'ready' as const,
      progress: 100,
      startTime: new Date(article.createdAt),
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        category: article.category,
        author: article.author,
        translations: article.translations
      }
    }));
  });

  // Автообновление локальных статей
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localArticleStorage.getArticlesByStatus('ready');
      setLocalArticles(stored.map(article => ({
        id: article.id,
        url: article.source.originalUrl || `local:${article.title}`,
        status: 'ready' as const,
        progress: 100,
        startTime: new Date(article.createdAt),
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          category: article.category,
          author: article.author,
          translations: article.translations
        }
      })));
    }, 5000); // Проверяем каждые 5 секунд

    return () => clearInterval(interval);
  }, []);
  
  // Fallback demo articles если все пусто
  const [demoArticles] = useState(() => {
    // Mock articles for testing when queue is empty
    if (readyArticles.length === 0 && localArticles.length === 0) {
      return [{
        id: 'mock-1',
        url: 'local:demo-article',
        status: 'ready' as const,
        progress: 100,
        startTime: new Date(),
        article: {
          id: 'demo-article-1',
          title: 'Demo Article for Testing',
          content: `# Тестовая статья для редактора

Это демонстрационная статья для тестирования функций редактора.

## Основные возможности

- Редактирование заголовка и содержания
- Выбор категории
- Управление изображениями
- Переводы на другие языки

## Заключение

После редактирования статья готова к публикации.`,
          excerpt: 'Демонстрационная статья для тестирования редактора админ панели',
          category: 'tech',
          author: 'Admin Demo',
          translations: {
            en: {
              title: 'Demo Article for Testing (EN)',
              content: '# Test Article for Editor\n\nThis is a demonstration article for testing editor functions.\n\n## Main Features\n\n- Title and content editing\n- Category selection\n- Image management\n- Translations to other languages\n\n## Conclusion\n\nAfter editing, the article is ready for publication.',
              excerpt: 'Demo article for testing admin panel editor'
            },
            pl: {
              title: 'Artykuł demonstracyjny do testowania (PL)',
              content: '# Artykuł testowy dla edytora\n\nTo jest artykuł demonstracyjny do testowania funkcji edytora.\n\n## Główne funkcje\n\n- Edycja tytułu i treści\n- Wybór kategorii\n- Zarządzanie obrazami\n- Tłumaczenia na inne języki\n\n## Wniosek\n\nPo edycji artykuł jest gotowy do publikacji.',
              excerpt: 'Artykuł demonstracyjny do testowania edytora panelu administracyjnego'
            }
          }
        }
      }];
    }
    return [];
  });
  
  const allArticles = [...readyArticles, ...localArticles, ...demoArticles];

  // Auto-select first article if none selected
  useEffect(() => {
    if (!selectedArticle && allArticles.length > 0) {
      selectArticle(allArticles[0].article!);
    }
  }, [allArticles, selectedArticle, selectArticle]);

  const tabs = [
    { id: 'preview', label: 'Preview', icon: '👁️', description: 'View article in all languages' },
    { id: 'editor', label: 'Editor', icon: '✏️', description: 'Edit content and metadata' },
    { id: 'images', label: 'Images', icon: '🖼️', description: 'Manage images, prompts & tags' },
    { id: 'translations', label: 'Translations', icon: '🌍', description: 'Manage EN/PL translations' }
  ];

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pl', label: 'Polish', flag: '🇵🇱' }
  ];

  // Handle "Add to Queue" — save as 'ready' and switch to queue tab
  const handleAddToQueue = () => {
    if (!selectedArticle) return;
    const saved = saveDraftSilently(false);
    if (saved) {
      localArticleStorage.updateArticleStatus(selectedArticle.id, 'ready');
    }
    useAdminStore.getState().setActiveTab('queue');
    toast.success('Article added to publishing queue');
  };

  // Source attribution helpers
  const handleAddSource = () => {
    if (!newSourceLabel.trim() || !newSourceUrl.trim() || !selectedArticle) return;
    const existing = selectedArticle.sourceAttributions || [];
    updateArticle({
      sourceAttributions: [...existing, { label: newSourceLabel.trim(), url: newSourceUrl.trim() }],
    });
    setNewSourceLabel('');
    setNewSourceUrl('');
  };

  const handleRemoveSource = (index: number) => {
    if (!selectedArticle) return;
    const existing = [...(selectedArticle.sourceAttributions || [])];
    existing.splice(index, 1);
    updateArticle({ sourceAttributions: existing });
  };

  return (
    <div className="space-y-6">
      {/* Resume Draft Banner */}
      {resumeDraft && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-medium">Unsaved draft found:</span> "{resumeDraft.title}"
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setResumeDraft(null)}
              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Dismiss
            </button>
            <button
              onClick={handleResumeDraft}
              className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
            >
              Resume Editing
            </button>
          </div>
        </div>
      )}

      {/* Article Selector */}
      {allArticles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                📚 Select Article to Edit
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {allArticles.length} articles ready for editing
              </p>
            </div>
            
            <select
              value={selectedArticle?.id || ''}
              onChange={(e) => {
                const article = readyArticles.find(job => job.article?.id === e.target.value)?.article;
                if (article) selectArticle(article);
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[200px]"
              title={selectedArticle?.title || 'Select an article'}
            >
              {readyArticles.map((job) => (
                <option 
                  key={job.article!.id} 
                  value={job.article!.id}
                  title={job.article!.title}
                >
                  {job.article!.title.substring(0, 50)}{job.article!.title.length > 50 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* No Articles Available */}
      {allArticles.length === 0 && (
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
                  
                  {selectedLanguage !== 'en' && !selectedArticle.translations[selectedLanguage] && (
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
            
            {activeTab === 'images' && (
              <div className="p-6">
                <ImageMetadataEditor
                  articleId={selectedArticle.id}
                  articleTitle={selectedArticle.title}
                  articleCategory={selectedArticle.category}
                  articleContent={selectedArticle.content}
                  articleExcerpt={selectedArticle.excerpt}
                />
              </div>
            )}
            
            {activeTab === 'translations' && (
              <TranslationPanel article={selectedArticle} />
            )}
          </div>

          {/* Source Attribution Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Source Attribution
              </h4>
              <button
                onClick={() => setShowSourceEditor(!showSourceEditor)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showSourceEditor ? 'Hide' : (selectedArticle.sourceAttributions?.length ? 'Edit' : 'Add Source')}
              </button>
            </div>

            {/* Existing sources */}
            {(selectedArticle.sourceAttributions?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedArticle.sourceAttributions!.map((src, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{src.label}</a>
                    {showSourceEditor && (
                      <button onClick={() => handleRemoveSource(i)} className="text-red-500 hover:text-red-700 ml-1">&times;</button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {(selectedArticle.sourceAttributions?.length ?? 0) === 0 && !showSourceEditor && (
              <p className="text-xs text-gray-400">No source attribution set</p>
            )}

            {/* Add source form */}
            {showSourceEditor && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newSourceLabel}
                  onChange={(e) => setNewSourceLabel(e.target.value)}
                  placeholder="Source name"
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleAddSource}
                  disabled={!newSourceLabel.trim() || !newSourceUrl.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded"
                >
                  Add
                </button>
              </div>
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
                  <span className="font-medium">Translations:</span> {Object.keys(selectedArticle.translations || {}).length}/2
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Category:</span> {selectedArticle.category}
                </div>
                {lastAutoSave && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Auto-saved {lastAutoSave.toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                >
                  Save Draft
                </button>

                <button
                  onClick={handleAddToQueue}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  Add to Queue
                </button>

                <button
                  onClick={async () => {
                    try {
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
                        toast.success(`"${selectedArticle.title}" published!`);
                      } else {
                        throw new Error(result.error || 'Publication failed');
                      }
                    } catch (error) {
                      toast.error(`Publication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                >
                  Publish Now
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
