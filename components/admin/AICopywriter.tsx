'use client';

/**
 * AI COPYWRITER COMPONENT
 * 
 * Allows admins to generate full article content from short prompts
 * using GPT-4o AI model
 */

import { useState } from 'react';
import toast from 'react-hot-toast';

interface AICopywriterProps {
  onContentGenerated: (content: {
    title: string;
    excerpt: string;
    content: string;
  }) => void;
  initialPrompt?: string;
  initialTitle?: string;
  category?: string;
  language?: 'en' | 'pl';
}

export default function AICopywriter({
  onContentGenerated,
  initialPrompt = '',
  initialTitle = '',
  category = 'Technology',
  language = 'en'
}: AICopywriterProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [title, setTitle] = useState(initialTitle);
  const [targetWords, setTargetWords] = useState(600);
  const [style, setStyle] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Estimate cost when prompt changes
  const handlePromptChange = async (value: string) => {
    setPrompt(value);
    
    if (value.length > 10) {
      try {
        const response = await fetch(
          `/api/admin/generate-article-content?prompt=${encodeURIComponent(value)}&targetWords=${targetWords}`
        );
        const data = await response.json();
        if (data.success) {
          setEstimatedCost(data.estimatedCost);
        }
      } catch (error) {
        console.error('Cost estimation error:', error);
      }
    } else {
      setEstimatedCost(null);
    }
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Please provide a more detailed prompt (at least 10 characters)');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('Generating article with AI... This may take 10-30 seconds');

    try {
      const response = await fetch('/api/admin/generate-article-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          title: title || undefined,
          category,
          language,
          targetWords,
          style
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content');
      }

      toast.success(
        `Article generated! ${result.wordCount} words • Cost: $${result.usage?.estimatedCost.toFixed(3)}`,
        { id: loadingToast, duration: 5000 }
      );

      onContentGenerated({
        title: result.title,
        excerpt: result.excerpt,
        content: result.content
      });

      // Reset form
      setPrompt('');
      setTitle('');
      setEstimatedCost(null);

    } catch (error: any) {
      toast.error(error.message || 'Failed to generate article', {
        id: loadingToast
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              AI Copywriter
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate full article from 1-2 sentences • Powered by GPT-4o
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
            {language === 'en' ? '🇬🇧 English' : '🇵🇱 Polski'}
          </span>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Article Topic / Prompt *
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
              (Describe what you want to write about)
            </span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Example: Write about the latest developments in quantum computing and how they impact the tech industry in 2024"
            className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 text-gray-900 dark:text-white placeholder-gray-400"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {prompt.length} characters {prompt.length >= 10 ? '✓' : '(min 10)'}
            </span>
            {estimatedCost !== null && (
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                💰 Est. cost: ${estimatedCost.toFixed(3)}
              </span>
            )}
          </div>
        </div>

        {/* Optional Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suggested Title
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
              (optional, AI will generate if not provided)
            </span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave empty for AI to generate title"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-white placeholder-gray-400"
            disabled={isGenerating}
          />
        </div>

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 pl-6 border-l-2 border-purple-200 dark:border-purple-700">
              {/* Target Words */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Word Count: {targetWords} words
                </label>
                <input
                  type="range"
                  min="300"
                  max="1500"
                  step="100"
                  value={targetWords}
                  onChange={(e) => setTargetWords(parseInt(e.target.value))}
                  className="w-full"
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>300</span>
                  <span>600 (recommended)</span>
                  <span>1500</span>
                </div>
              </div>

              {/* Writing Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Writing Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['professional', 'casual', 'technical'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s as any)}
                      disabled={isGenerating}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        style === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || prompt.trim().length < 10}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Generating Article...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">✨</span>
              <span>Generate Full Article with AI</span>
              <span className="text-2xl">✨</span>
            </>
          )}
        </button>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-lg">💡</span>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> The more specific your prompt, the better the result.
            Include key points, target audience, and any specific requirements.
            AI will generate a professional, SEO-optimized article with proper structure.
          </div>
        </div>
      </div>
    </div>
  );
}




