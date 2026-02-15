'use client';

import { useState, useEffect } from 'react';
import URLInput from './URLParser/URLInput';
import TextInput from './URLParser/TextInput';
import AIGenerate from './URLParser/AIGenerate';
import ParsingQueue from './URLParser/ParsingQueue';
import ArticleCreatorModal from './ArticleCreatorModal';
import ParsingProgressModal from './ParsingProgressModal';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';

export default function URLParser() {
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'ai'>('url');
  const [successArticle, setSuccessArticle] = useState<Article | null>(null);
  const [prevReadyJobsLength, setPrevReadyJobsLength] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState<1 | 2 | 3 | 4>(1);
  const [progressTitle, setProgressTitle] = useState('');
  const { parsingQueue, statistics } = useAdminStore();
  
  const activeJobs = parsingQueue.filter(job => 
    ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status)
  ).length;
  
  const readyJobs = parsingQueue.filter(job => job.status === 'ready').length;
  const failedJobs = parsingQueue.filter(job => job.status === 'failed').length;

  // Отслеживаем активные работы для прогресс-бара
  useEffect(() => {
    const activeJob = parsingQueue.find(job => 
      ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status)
    );

    if (activeJob) {
      setShowProgress(true);
      setProgressTitle(activeJob.url || 'Processing article');
      
      // Мапим статус на шаг (1-4)
      switch (activeJob.status) {
        case 'parsing':
          setProgressStep(1);
          break;
        case 'ai_processing':
        case 'translating':
          setProgressStep(2);
          break;
        case 'images':
          setProgressStep(3);
          break;
        default:
          setProgressStep(4);
      }
    } else {
      setShowProgress(false);
    }
  }, [parsingQueue]);

  // Отслеживаем новые готовые статьи
  useEffect(() => {
    if (readyJobs > prevReadyJobsLength) {
      // Новая статья готова!
      const latestReadyJob = parsingQueue
        .filter(job => job.status === 'ready' && job.article)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
      
      if (latestReadyJob && latestReadyJob.article) {
        setSuccessArticle(latestReadyJob.article);
      }
    }
    setPrevReadyJobsLength(readyJobs);
  }, [readyJobs, parsingQueue, prevReadyJobsLength]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-lg">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {parsingQueue.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total in Queue
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 dark:text-yellow-400 text-lg">🔄</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processing
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {readyJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Ready to Publish
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {failedJobs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Failed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Article</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose how you want to create a new article</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setInputMode('url')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                inputMode === 'url'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>🔗</span>
              From URL
            </button>
            
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                inputMode === 'text'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>✏️</span>
              From Text
            </button>

            <button
              onClick={() => setInputMode('ai')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                inputMode === 'ai'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>🤖</span>
              AI Generate
            </button>
          </div>
        </div>
      </div>

      {/* Input Form */}
      {inputMode === 'url' && <URLInput />}
      {inputMode === 'text' && <TextInput />}
      {inputMode === 'ai' && <AIGenerate />}

      {/* Processing Info */}
      {activeJobs > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
              Active Processing
            </h4>
          </div>
          
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
            {activeJobs} articles are currently being processed. Average processing time: ~{statistics.averageProcessingTime || 60}s
          </p>
          
          <div className="flex flex-wrap gap-2">
            {parsingQueue
              .filter(job => ['parsing', 'ai_processing', 'translating', 'images'].includes(job.status))
              .slice(0, 3)
              .map(job => (
                <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {(() => {
                      const sourceUrls = job.sourceUrls && job.sourceUrls.length > 0 ? job.sourceUrls : [];
                      const sourceCount = sourceUrls.length;
                      const hasSourceText = Boolean(job.sourceText?.trim());

                      if (job.url.startsWith('text:')) {
                        if (sourceCount > 0) {
                          return `Text + ${sourceCount} URL${sourceCount > 1 ? 's' : ''}`;
                        }
                        return 'Text / AI input';
                      }

                      if (sourceCount > 1 || hasSourceText) {
                        return `${sourceCount} source URL${sourceCount > 1 ? 's' : ''}${hasSourceText ? ' + text' : ''}`;
                      }

                      try {
                        return new URL(job.url).hostname;
                      } catch {
                        return 'Source';
                      }
                    })()}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {job.status === 'parsing' && '🔍 Extracting content'}
                    {job.status === 'ai_processing' && '🤖 AI processing'}
                    {job.status === 'translating' && '🌍 Translation EN/PL'}
                    {job.status === 'images' && '🖼️ Image selection'}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            
            {activeJobs > 3 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm flex items-center justify-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  +{activeJobs - 3} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {readyJobs > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                🎉 Articles Ready!
              </h4>
              <p className="text-green-700 dark:text-green-300 text-sm">
                {readyJobs} articles successfully processed and ready for publication
              </p>
            </div>
            
            <button 
              onClick={() => useAdminStore.getState().setActiveTab('queue')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              📤 Go to Publishing Queue
            </button>
          </div>
        </div>
      )}

      {/* Article Creator Modal */}
      {successArticle && (
        <ArticleCreatorModal
          article={successArticle}
          onClose={() => setSuccessArticle(null)}
        />
      )}

      {/* Main Queue */}
      <ParsingQueue />

      {/* Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          💡 Tips & Best Practices
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🎯</span>
              <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Choose the right category
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    This will help AI process content better
                  </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-lg">⚡</span>
              <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Use direct links
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Avoid redirect links and shortened URLs
                  </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔍</span>
              <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Check accessibility
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Ensure article opens without registration
                  </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-lg">🚀</span>
              <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Process in batches
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Add up to 5 URLs simultaneously for optimal speed
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProgress && (
        <ParsingProgressModal
          isOpen={showProgress}
          currentStep={progressStep}
          articleTitle={progressTitle}
        />
      )}

    </div>
  );
}

