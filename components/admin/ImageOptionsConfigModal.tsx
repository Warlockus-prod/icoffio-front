'use client';

import { useState } from 'react';

interface ImageOptionsConfigModalProps {
  isOpen: boolean;
  articleTitle: string;
  onGenerate: (config: ImageGenerationConfig) => void;
  onClose: () => void;
}

export interface ImageGenerationConfig {
  unsplashCount: number; // 0-5
  aiCount: number; // 0-5
  customQueries: string[]; // Custom Unsplash search queries
  customPrompts: string[]; // Custom AI prompts
}

export default function ImageOptionsConfigModal({
  isOpen,
  articleTitle,
  onGenerate,
  onClose
}: ImageOptionsConfigModalProps) {
  const [unsplashCount, setUnsplashCount] = useState(3);
  const [aiCount, setAiCount] = useState(2);
  
  // Auto-generated queries/prompts (editable)
  const [queries, setQueries] = useState([
    `${articleTitle.substring(0, 30)} technology`,
    'modern innovation',
    'digital transformation'
  ]);
  
  const [prompts, setPrompts] = useState([
    `Professional editorial image for "${articleTitle}", modern technology style, high quality`,
    `Abstract illustration representing "${articleTitle}", minimalist design, vibrant colors`
  ]);

  if (!isOpen) return null;

  const totalImages = unsplashCount + aiCount;

  const handleGenerate = () => {
    onGenerate({
      unsplashCount,
      aiCount,
      customQueries: queries.slice(0, unsplashCount),
      customPrompts: prompts.slice(0, aiCount)
    });
    onClose();
  };

  const addQuery = () => {
    if (queries.length < 5) {
      setQueries([...queries, '']);
    }
  };

  const addPrompt = () => {
    if (prompts.length < 5) {
      setPrompts([...prompts, '']);
    }
  };

  const updateQuery = (index: number, value: string) => {
    const newQueries = [...queries];
    newQueries[index] = value;
    setQueries(newQueries);
  };

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const removeQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index));
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ⚙️ Configure Image Generation
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Customize number of options and edit search queries/AI prompts
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Number of Options */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Number of Options (Total: {totalImages}/10)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Unsplash Count */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  📷 Unsplash Images
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={unsplashCount}
                    onChange={(e) => setUnsplashCount(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white w-8 text-center">
                    {unsplashCount}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {unsplashCount === 0 ? 'No Unsplash images' : `${unsplashCount} professional photo${unsplashCount > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* AI Count */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  🤖 AI Generated
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white w-8 text-center">
                    {aiCount}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {aiCount === 0 ? 'No AI images' : `${aiCount} AI-generated image${aiCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Unsplash Queries */}
          {unsplashCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📷 Unsplash Search Queries ({queries.length})
                </h3>
                {queries.length < 5 && (
                  <button
                    onClick={addQuery}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    + Add Query
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {queries.map((query, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium w-6">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => updateQuery(index, e.target.value)}
                      placeholder="e.g., AI technology, modern innovation"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    {queries.length > 1 && (
                      <button
                        onClick={() => removeQuery(index)}
                        className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        title="Remove query"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Each query will find 1 image. First {unsplashCount} queries will be used.
              </p>
            </div>
          )}

          {/* AI Prompts */}
          {aiCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🤖 AI Generation Prompts ({prompts.length})
                </h3>
                {prompts.length < 5 && (
                  <button
                    onClick={addPrompt}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    + Add Prompt
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {prompts.map((prompt, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium w-6 mt-2">
                      {index + 1}.
                    </span>
                    <textarea
                      value={prompt}
                      onChange={(e) => updatePrompt(index, e.target.value)}
                      placeholder="e.g., Professional image about AI, modern style, high quality"
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    {prompts.length > 1 && (
                      <button
                        onClick={() => removePrompt(index)}
                        className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm mt-1"
                        title="Remove prompt"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Each prompt generates 1 image via DALL-E 3. First {aiCount} prompts will be used.
              </p>
            </div>
          )}

          {/* Warning for zero images */}
          {totalImages === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm flex items-center gap-2">
                ⚠️ <strong>No images will be generated.</strong> Article will proceed without image selection.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalImages > 0 ? (
                <>Generating <strong className="text-gray-900 dark:text-white">{totalImages}</strong> images</>
              ) : (
                <>No images</>
              )}
            </div>
            <button
              onClick={handleGenerate}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-purple-500/50 transition-all"
            >
              {totalImages > 0 ? '🎨 Generate Images' : '⏭️ Skip Images'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


