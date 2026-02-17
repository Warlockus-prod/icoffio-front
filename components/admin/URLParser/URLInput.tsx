'use client';

import { useMemo, useState } from 'react';
import { useAdminStore, type ContentStyleType } from '@/lib/stores/admin-store';

const CATEGORIES = [
  { id: 'ai', label: 'AI & Machine Learning', icon: '🤖', color: 'blue' },
  { id: 'apple', label: 'Apple & iOS', icon: '🍎', color: 'gray' },
  { id: 'tech', label: 'Technology', icon: '⚙️', color: 'green' },
  { id: 'news', label: 'News', icon: '📰', color: 'red' },
  { id: 'digital', label: 'Digital & Trends', icon: '📱', color: 'purple' },
];

const CONTENT_STYLES: { id: ContentStyleType; label: string; icon: string; description: string }[] = [
  { id: 'journalistic', label: 'Journalistic', icon: '📰', description: 'Engaging, wide audience' },
  { id: 'as-is', label: 'Keep As Is', icon: '✋', description: 'No changes to text' },
  { id: 'seo-optimized', label: 'SEO Optimized', icon: '🔍', description: 'Keywords & structure' },
  { id: 'academic', label: 'Academic', icon: '🎓', description: 'Formal, scientific' },
  { id: 'casual', label: 'Casual', icon: '💬', description: 'Friendly, conversational' },
  { id: 'technical', label: 'Technical', icon: '⚙️', description: 'Detailed, precise' },
];

function extractUrls(input: string): string[] {
  const matches = input.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const normalized = matches.map((url) => url.replace(/[),.;!?]+$/g, '').trim());
  return Array.from(new Set(normalized.filter(Boolean)));
}

function validateUrl(inputUrl: string): boolean {
  try {
    const urlObj = new URL(inputUrl);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

export default function URLInput() {
  const [urlInput, setUrlInput] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [combineIntoSingleArticle, setCombineIntoSingleArticle] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('tech');
  const [selectedStyle, setSelectedStyle] = useState<ContentStyleType>('journalistic');
  const [includeSourceAttribution, setIncludeSourceAttribution] = useState(true);
  const [enableQualityGate, setEnableQualityGate] = useState(true);
  const [minimumQualityScore, setMinimumQualityScore] = useState(65);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);

  const { addUrlToQueue, parsingQueue } = useAdminStore();
  const parsedUrls = useMemo(() => extractUrls(urlInput), [urlInput]);
  const hasAdditionalContext = additionalContext.trim().length > 0;
  const shouldCreateSingleArticle = combineIntoSingleArticle || hasAdditionalContext;

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUrlInput(value);

    if (!value.trim()) {
      setValidationError('');
      return;
    }

    const urls = extractUrls(value);
    if (urls.length === 0) {
      setValidationError('Add at least one valid URL (https://...)');
      return;
    }

    const invalidUrl = urls.find((url) => !validateUrl(url));
    if (invalidUrl) {
      setValidationError(`Invalid URL: ${invalidUrl}`);
      return;
    }

    if (urls.length > 5) {
      setValidationError('Maximum 5 URLs for one submission');
      return;
    }

    setValidationError('');
  };

  const checkUrlAvailability = async (inputUrl: string): Promise<boolean> => {
    try {
      setIsValidating(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/check-url?url=${encodeURIComponent(inputUrl)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('URL availability check failed:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const urls = extractUrls(urlInput);
    if (urls.length === 0) {
      setValidationError('Enter at least one valid URL');
      return;
    }

    const invalidUrl = urls.find((url) => !validateUrl(url));
    if (invalidUrl) {
      setValidationError(`Invalid URL: ${invalidUrl}`);
      return;
    }

    if (urls.length > 5) {
      setValidationError('Maximum 5 URLs for one submission');
      return;
    }

    const duplicates = urls.filter((url) => parsingQueue.some((job) => job.url === url));
    if (!shouldCreateSingleArticle && duplicates.length > 0) {
      setValidationError(`Already in queue: ${duplicates.length} URL(s)`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!shouldCreateSingleArticle && urls.length === 1) {
        const isAvailable = await checkUrlAvailability(urls[0]);
        if (!isAvailable) {
          setValidationError('URL is unavailable or not responding');
          return;
        }
      }

      if (shouldCreateSingleArticle) {
        addUrlToQueue(urls[0], selectedCategory, selectedStyle, {
          sourceUrls: urls,
          sourceText: additionalContext.trim() || undefined,
          includeSourceAttribution,
          enableQualityGate,
          minQualityScore: minimumQualityScore,
        });
      } else {
        urls.forEach((url) =>
          addUrlToQueue(url, selectedCategory, selectedStyle, {
            includeSourceAttribution,
            enableQualityGate,
            minQualityScore: minimumQualityScore,
          })
        );
      }
      setUrlInput('');
      setAdditionalContext('');
      setCombineIntoSingleArticle(false);
      setValidationError('');
    } catch {
      setValidationError('Error adding URL(s)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      purple:
        'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    };
    return colors[category as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          🔗 Add URL to Parsing Queue
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Add one or many URLs (one per line) for automatic parsing, translation and processing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Article URL(s)
          </label>
          <div className="relative">
            <textarea
              id="url"
              value={urlInput}
              onChange={handleUrlChange}
              rows={3}
              placeholder={'https://example.com/article-1\nhttps://example.com/article-2'}
              className={`w-full px-4 py-3 pl-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white resize-y ${
                validationError
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              disabled={isSubmitting}
            />
            <div className="absolute left-4 top-4">
              {isValidating ? (
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              ) : (
                <span className="text-gray-400">🌐</span>
              )}
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Detected URLs: {parsedUrls.length}
          </div>

          {validationError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <span>⚠️</span>
              {validationError}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/20 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Publication Safeguards</h4>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSourceAttribution}
              onChange={(e) => setIncludeSourceAttribution(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span>Add source links block at the end of article</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enableQualityGate}
              onChange={(e) => setEnableQualityGate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span>Block publication when quality score is too low</span>
          </label>

          {enableQualityGate && (
            <div>
              <label htmlFor="quality-threshold" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Minimum quality score: {minimumQualityScore}
              </label>
              <input
                id="quality-threshold"
                type="range"
                min={40}
                max={95}
                step={1}
                value={minimumQualityScore}
                onChange={(e) => setMinimumQualityScore(Number(e.target.value))}
                className="w-full"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/20 space-y-3">
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={combineIntoSingleArticle}
              onChange={(e) => setCombineIntoSingleArticle(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span>Create one article from all entered URLs (multi-analysis)</span>
          </label>

          <div>
            <label htmlFor="url-additional-context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional text context (optional)
            </label>
            <textarea
              id="url-additional-context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              placeholder="Add your notes, angles, key facts, or what to focus on..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              When text context is filled, sources are processed as one combined article.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Category</label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedCategory === category.id
                    ? getCategoryColor(category.color)
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Writing Style
            </label>
            <button
              type="button"
              onClick={() => setShowStyleOptions(!showStyleOptions)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showStyleOptions ? 'Hide options' : 'Show all options'}
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-xl">{CONTENT_STYLES.find((s) => s.id === selectedStyle)?.icon}</span>
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  {CONTENT_STYLES.find((s) => s.id === selectedStyle)?.label}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {CONTENT_STYLES.find((s) => s.id === selectedStyle)?.description}
                </div>
              </div>
            </div>
          </div>

          {showStyleOptions && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CONTENT_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyle(style.id);
                    setShowStyleOptions(false);
                  }}
                  className={`p-2 rounded-lg border transition-all duration-200 text-left ${
                    selectedStyle === style.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{style.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{style.label}</div>
                      <div className="text-xs opacity-70">{style.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {parsingQueue.length > 0 && <span>📊 {parsingQueue.length} URLs in queue</span>}
          </div>

          <button
            type="submit"
            disabled={parsedUrls.length === 0 || !!validationError || isSubmitting || isValidating}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>
                  {shouldCreateSingleArticle
                    ? `Create 1 article from ${parsedUrls.length} URL${parsedUrls.length > 1 ? 's' : ''}`
                    : parsedUrls.length > 1
                      ? `Add ${parsedUrls.length} URLs`
                      : 'Add to Queue'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">💡 Quick Add Examples:</h4>
        <div className="grid grid-cols-1 gap-2">
          {[
            'https://openai.com/news/',
            'https://wylsa.com/tech-news/',
            'https://techcrunch.com/category/artificial-intelligence/',
          ].map((exampleUrl, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setUrlInput(exampleUrl)}
              className="text-left text-xs text-blue-600 dark:text-blue-400 hover:underline p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {exampleUrl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
