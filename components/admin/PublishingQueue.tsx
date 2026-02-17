'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import { ArticlesListSkeleton } from './LoadingStates';
import { logAdminActivity } from '@/lib/activity-logger';

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

// Schedule data interface
interface ScheduledPublish {
  articleId: string;
  scheduledTime: Date;
  articleTitle: string;
}

export default function PublishingQueue() {
  const { parsingQueue, publishingQueue, removeJobFromQueue, updateJobStatus, addActivity, selectArticle, setActiveTab } = useAdminStore();
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState<Set<string>>(new Set());
  const [previewArticle, setPreviewArticle] = useState<ReadyArticle | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'failed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Scheduler state
  const [showScheduler, setShowScheduler] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledPublishes, setScheduledPublishes] = useState<ScheduledPublish[]>([]);

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
    
    // Load scheduled publishes from localStorage
    const savedSchedules = localStorage.getItem('icoffio_scheduled_publishes');
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules);
        setScheduledPublishes(parsed.map((s: any) => ({
          ...s,
          scheduledTime: new Date(s.scheduledTime)
        })));
      } catch (e) {
        console.error('Failed to load scheduled publishes:', e);
      }
    }
  }, []);
  
  // Check for scheduled publishes every minute
  useEffect(() => {
    const checkScheduled = () => {
      const now = new Date();
      const due = scheduledPublishes.filter(s => new Date(s.scheduledTime) <= now);
      
      if (due.length > 0) {
        due.forEach(scheduled => {
          const article = readyForPublish.find(a => a.id === scheduled.articleId);
          if (article) {
            toast.success(`⏰ Publishing scheduled article: ${scheduled.articleTitle}`);
            handlePublishSingle(article);
          }
        });
        
        // Remove published from schedule
        const remaining = scheduledPublishes.filter(s => new Date(s.scheduledTime) > now);
        setScheduledPublishes(remaining);
        localStorage.setItem('icoffio_scheduled_publishes', JSON.stringify(remaining));
      }
    };
    
    const interval = setInterval(checkScheduled, 60000); // Check every minute
    checkScheduled(); // Initial check
    
    return () => clearInterval(interval);
  }, [scheduledPublishes, readyForPublish]);
  
  // Handle schedule article
  const handleScheduleArticle = (articleId: string, articleTitle: string) => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please select date and time');
      return;
    }
    
    const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);
    
    if (scheduledTime <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }
    
    const newSchedule: ScheduledPublish = {
      articleId,
      scheduledTime,
      articleTitle
    };
    
    const updated = [...scheduledPublishes.filter(s => s.articleId !== articleId), newSchedule];
    setScheduledPublishes(updated);
    localStorage.setItem('icoffio_scheduled_publishes', JSON.stringify(updated));
    
    toast.success(`📅 Scheduled for ${scheduledTime.toLocaleString()}`);
    setShowScheduler(null);
    setScheduleDate('');
    setScheduleTime('');
  };
  
  // Cancel scheduled publish
  const handleCancelSchedule = (articleId: string) => {
    const updated = scheduledPublishes.filter(s => s.articleId !== articleId);
    setScheduledPublishes(updated);
    localStorage.setItem('icoffio_scheduled_publishes', JSON.stringify(updated));
    toast.success('Schedule cancelled');
  };
  
  // Get scheduled time for article
  const getScheduledTime = (articleId: string) => {
    return scheduledPublishes.find(s => s.articleId === articleId);
  };

  const stats = {
    total: readyForPublish.length,
    selected: selectedArticles.size,
    publishing: isPublishing.size,
    scheduled: scheduledPublishes.length
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
        
        // ✅ ИСПРАВЛЕНИЕ: Показываем ссылки на обе языковые версии
        const enUrl = result.urls?.en || result.url;
        const plUrl = result.urls?.pl;
        
        // Добавляем активность (локально)
        addActivity({
          type: 'article_published',
          message: `Added to queue: ${article.title}`,
          url: enUrl
        });
        
        // 📊 Логируем в Activity Log (Supabase)
        logAdminActivity('publish', {
          entity_type: 'article',
          entity_id: article.id,
          entity_title: article.title,
          entity_url: enUrl,
          entity_url_pl: plUrl,
          metadata: {
            slug: result.slug,
            category: article.category,
            hasTranslations: !!article.translations?.pl
          }
        });

        console.log('✅ Article added to publishing queue');
        console.log('🔗 EN URL:', enUrl);
        console.log('🔗 PL URL:', plUrl);
        
        // Success toast с ссылкой (EN + PL)
        toast.success(
          <div>
            <div>✅ "{article.title.substring(0, 40)}..." added to queue!</div>
            {enUrl && (
              <a 
                href={enUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs underline mt-1 block text-blue-600 hover:text-blue-800"
              >
                🔗 Open article (EN)
              </a>
            )}
          </div>, 
          {
            id: toastId,
            duration: 6000,
          }
        );
      } else {
        if (result.reason === 'quality_gate_failed' && result.qualityGate) {
          const enScore = result.qualityGate?.scores?.en ?? 'n/a';
          const plScore = result.qualityGate?.scores?.pl ?? 'n/a';
          const minScore = result.qualityGate?.minimumQualityScore ?? 'n/a';
          throw new Error(`Quality gate blocked publish (EN: ${enScore}, PL: ${plScore}, min: ${minScore})`);
        }

        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      console.error('❌ Publication failed:', error);
      addActivity({
        type: 'parsing_failed',
        message: `Publication error: ${article.title}`,
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
              Manage articles ready for publishing
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
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.publishing}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Publishing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.scheduled}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Scheduled</div>
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
                      <span>{Object.keys(article.translations || {}).length || 2} languages</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handlePreview(article)}
                      className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors text-sm"
                    >
                      👁️ Preview
                    </button>
                    
                    <button
                      onClick={() => {
                        selectArticle(article);
                        setActiveTab('editor');
                      }}
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
                    
                    {/* Schedule Button */}
                    {getScheduledTime(article.id) ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-sm">
                          📅 {new Date(getScheduledTime(article.id)!.scheduledTime).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleCancelSchedule(article.id)}
                          className="px-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors text-sm"
                          title="Cancel schedule"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowScheduler(showScheduler === article.id ? null : article.id)}
                        className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors text-sm"
                      >
                        ⏰ Schedule
                      </button>
                    )}
                  </div>
                  
                  {/* Scheduler Panel */}
                  {showScheduler === article.id && (
                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h5 className="font-medium text-orange-800 dark:text-orange-300 mb-3">⏰ Schedule Publication</h5>
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => handleScheduleArticle(article.id, article.title)}
                          disabled={!scheduleDate || !scheduleTime}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          ✅ Confirm
                        </button>
                        <button
                          onClick={() => {
                            setShowScheduler(null);
                            setScheduleDate('');
                            setScheduleTime('');
                          }}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📄 Article Preview
                </h3>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {/* Featured Image */}
                {previewArticle.image && (
                  <div className="mb-6">
                    <img
                      src={previewArticle.image}
                      alt={previewArticle.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <h1 className="text-3xl font-bold mb-4">{previewArticle.title}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-4">{previewArticle.excerpt}</p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  By {previewArticle.author} • {previewArticle.category}
                </div>
                
                <div 
                  className="prose-content"
                  dangerouslySetInnerHTML={{ 
                    __html: marked(previewArticle.content || '') 
                  }} 
                />
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
                    useAdminStore.getState().setActiveTab('editor');
                    useAdminStore.getState().selectArticle(previewArticle);
                    handleClosePreview();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  ✏️ Edit Article
                </button>
                <button
                  onClick={() => {
                    handlePublishSingle(previewArticle);
                    handleClosePreview();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  🚀 Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
