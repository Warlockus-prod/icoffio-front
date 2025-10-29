'use client';

import { useState } from 'react';
import type { ImageSource } from '@/lib/image-generation-service';

interface ImageSourceSelectorProps {
  onImageGenerated: (url: string, source: ImageSource) => void;
  articleTitle: string;
  articleExcerpt?: string;
  articleCategory?: string;
  currentImageUrl?: string;
}

export default function ImageSourceSelector({
  onImageGenerated,
  articleTitle,
  articleExcerpt,
  articleCategory,
  currentImageUrl,
}: ImageSourceSelectorProps) {
  const [selectedSource, setSelectedSource] = useState<ImageSource>('unsplash');
  const [customUrl, setCustomUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    setGeneratedUrl(null);
    setCost(null);

    try {
      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: selectedSource,
          title: articleTitle,
          excerpt: articleExcerpt,
          category: articleCategory,
          customUrl: selectedSource === 'custom' ? customUrl : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedUrl(data.url);
      setCost(data.cost || 0);
      onImageGenerated(data.url, selectedSource);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 md:p-6 bg-gray-50 dark:bg-gray-800/50">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        🖼️ Article Image Source
      </h3>

      {/* Source Selection */}
      <div className="space-y-3 mb-6">
        {/* DALL-E 3 Option */}
        <label
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
            selectedSource === 'dalle'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <input
            type="radio"
            name="imageSource"
            value="dalle"
            checked={selectedSource === 'dalle'}
            onChange={(e) => setSelectedSource(e.target.value as ImageSource)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                ⭐ DALL-E 3 (Generate Unique)
              </span>
              <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                ~$0.08/image
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-generated unique images tailored to your article content. High quality, HD resolution (1792x1024).
            </p>
          </div>
        </label>

        {/* Unsplash Option */}
        <label
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
            selectedSource === 'unsplash'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <input
            type="radio"
            name="imageSource"
            value="unsplash"
            checked={selectedSource === 'unsplash'}
            onChange={(e) => setSelectedSource(e.target.value as ImageSource)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                📸 Unsplash (Stock Photo)
              </span>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Free
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              High-quality stock photos from Unsplash. Fast and free, perfect for quick publishing.
            </p>
          </div>
        </label>

        {/* Custom URL Option */}
        <label
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
            selectedSource === 'custom'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <input
            type="radio"
            name="imageSource"
            value="custom"
            checked={selectedSource === 'custom'}
            onChange={(e) => setSelectedSource(e.target.value as ImageSource)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                🔗 Custom URL
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Manual
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Provide your own image URL from external source.
            </p>
            
            {selectedSource === 'custom' && (
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        </label>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || (selectedSource === 'custom' && !customUrl)}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>🎨</span>
            <span>
              {selectedSource === 'dalle' ? 'Generate Image' : 
               selectedSource === 'unsplash' ? 'Get Stock Photo' : 
               'Use Custom URL'}
            </span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Error generating image
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {generatedUrl && !error && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-green-600 dark:text-green-400 text-xl">✅</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Image generated successfully!
              </p>
              {cost !== null && cost > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Cost: ${cost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          
          {/* Preview */}
          <div className="mt-3 rounded-lg overflow-hidden">
            <img
              src={generatedUrl}
              alt="Generated preview"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Current Image Display */}
      {currentImageUrl && !generatedUrl && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Image:
          </p>
          <div className="rounded-lg overflow-hidden">
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tip:</strong> DALL-E 3 creates unique, context-aware images perfect for professional articles. 
            Unsplash is great for quick publishing with zero cost.
          </p>
        </div>
      </div>
    </div>
  );
}





