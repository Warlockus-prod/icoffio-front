'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

interface TextInputProps {
  onSubmit?: () => void;
}

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

export default function TextInput({ onSubmit }: TextInputProps) {
  const { addTextToQueue, parsingQueue } = useAdminStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrlsInput, setSourceUrlsInput] = useState('');
  const [category, setCategory] = useState('');
  const [includeSourceAttribution, setIncludeSourceAttribution] = useState(true);
  const [enableQualityGate, setEnableQualityGate] = useState(true);
  const [minimumQualityScore, setMinimumQualityScore] = useState(65);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categories = [
    { id: 'ai', name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'apple', name: 'Apple & iOS', icon: '🍎' },
    { id: 'tech', name: 'Technology', icon: '⚙️' },
    { id: 'news', name: 'News', icon: '📰' }, // ✨ NEW
    { id: 'digital', name: 'Digital & Trends', icon: '📱' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const sourceUrls = extractUrls(sourceUrlsInput);
    if (sourceUrls.length > 5) {
      setSubmitError('Maximum 5 reference URLs per article');
      return;
    }

    const invalidUrl = sourceUrls.find((url) => !validateUrl(url));
    if (invalidUrl) {
      setSubmitError(`Invalid reference URL: ${invalidUrl}`);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await addTextToQueue(
        title.trim(),
        content.trim(),
        category || 'tech',
        {
          sourceUrls,
          includeSourceAttribution,
          enableQualityGate,
          minQualityScore: minimumQualityScore,
        }
      );
      
      // Очищаем форму после успешной отправки
      setTitle('');
      setContent('');
      setSourceUrlsInput('');
      setCategory('');
      
      onSubmit?.();
    } catch (error) {
      console.error('Error adding text to queue:', error);
      const message = error instanceof Error
        ? error.message
        : 'Failed to add article to queue. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = title.trim() && content.trim();
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const sourceUrlCount = extractUrls(sourceUrlsInput).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>✏️</span>
          Create Article from Text
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enter article title and content for automatic processing and translation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="article-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Title
          </label>
          <div className="relative">
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Enter article title..."
              disabled={isSubmitting}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="text-lg">📝</span>
            </div>
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <label htmlFor="article-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Article Content
          </label>
          <div className="relative">
            <textarea
              id="article-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-500 dark:placeholder:text-gray-400
                       resize-y min-h-[200px]"
              placeholder="Enter article content. AI will enhance text, create translations, and select images..."
              disabled={isSubmitting}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {wordCount} words
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(category === cat.id ? '' : cat.id);
                  if (submitError) setSubmitError(null);
                }}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                  category === cat.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                disabled={isSubmitting}
              >
                <span>{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Source URLs */}
        <div className="space-y-2">
          <label htmlFor="article-source-urls" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference URL(s) (optional)
          </label>
          <textarea
            id="article-source-urls"
            value={sourceUrlsInput}
            onChange={(e) => {
              setSourceUrlsInput(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-500 dark:placeholder:text-gray-400
                     resize-y"
            placeholder={'https://example.com/source-1\nhttps://example.com/source-2'}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI will combine your text with these source links into one article. Max 5 URLs. Detected: {sourceUrlCount}
          </p>
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
            <span>Block publication when quality score is below threshold</span>
          </label>

          {enableQualityGate && (
            <div>
              <label htmlFor="text-quality-threshold" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Minimum quality score: {minimumQualityScore}
              </label>
              <input
                id="text-quality-threshold"
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

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all ${
              isFormValid && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Create Article</span>
              </>
            )}
          </button>

          {parsingQueue.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>📊</span>
              <span>{parsingQueue.length} article{parsingQueue.length !== 1 ? 's' : ''} in queue</span>
            </div>
          )}
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            {submitError}
          </div>
        )}
      </form>

      {/* Writing Tips */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span>💡</span>
          Writing Tips
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>Title:</strong> Keep it concise and informative (up to 70 characters)</li>
          <li>• <strong>Content:</strong> Write structured content with paragraphs for better readability</li>
          <li>• <strong>AI improvements:</strong> System will automatically enhance style and add SEO optimization</li>
          <li>• <strong>Translations:</strong> English and Polish versions will be automatically created</li>
          <li>• <strong>Images:</strong> AI will select relevant images from Unsplash or create new ones</li>
        </ul>
      </div>
    </div>
  );
}
