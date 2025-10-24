'use client';

import { useState } from 'react';
import { useAdminStore, type Article, type ImageType } from '@/lib/stores/admin-store';

interface AIImageGeneratorProps {
  article?: Article | null;
  onImageGenerated: (image: ImageType) => void;
}

const STYLES = [
  { id: 'realistic', label: 'Realistic', icon: '📷', description: 'Photorealistic images' },
  { id: 'artistic', label: 'Artistic', icon: '🎨', description: 'Creative and stylized' },
  { id: 'minimal', label: 'Minimal', icon: '⚪', description: 'Clean and simple' },
  { id: 'vibrant', label: 'Vibrant', icon: '🌈', description: 'Bright and colorful' },
  { id: 'tech', label: 'Tech', icon: '💻', description: 'Modern and futuristic' }
];

const SIZES = [
  { id: '1024x1024', label: 'Square (1024×1024)', icon: '⬜', aspect: '1:1' },
  { id: '1792x1024', label: 'Landscape (1792×1024)', icon: '🖼️', aspect: '16:9' },
  { id: '1024x1792', label: 'Portrait (1024×1792)', icon: '📱', aspect: '9:16' }
];

const PRESET_PROMPTS = [
  'Modern technology concept with clean design',
  'Artificial intelligence and machine learning visualization',
  'Futuristic digital transformation concept',
  'Professional business and innovation theme',
  'Apple products in modern minimalist setting',
  'Abstract technology background with geometric shapes'
];

export default function AIImageGenerator({ article, onImageGenerated }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError('');
    setGenerationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 10, 80));
    }, 1000);

    try {
      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          article,
          style,
          size
        })
      });

      const result = await response.json();
      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (result.success) {
        onImageGenerated(result.image);
        setPrompt(''); // Clear prompt after successful generation
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      setError(error instanceof Error ? error.message : 'Generation failed');
      clearInterval(progressInterval);
      setGenerationProgress(0);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  const handlePresetPrompt = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  const generateContextualPrompt = () => {
    if (!article) return;

    let contextualPrompt = '';
    
    // Generate prompt based on article context
    const category = article.category;
    const title = article.title;
    
    if (category === 'ai') {
      contextualPrompt = `Modern artificial intelligence concept related to "${title}"`;
    } else if (category === 'apple') {
      contextualPrompt = `Apple products and technology related to "${title}"`;
    } else if (category === 'tech') {
      contextualPrompt = `Technology and innovation concept for "${title}"`;
    } else {
      contextualPrompt = `Modern digital concept for "${title}"`;
    }
    
    setPrompt(contextualPrompt);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          🤖 AI Image Generator
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Generate custom images using OpenAI DALL-E 3 based on your article content
        </p>
      </div>

      {/* Prompt Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Image Description
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
            placeholder="Describe the image you want to generate... (e.g., 'Modern technology concept with artificial intelligence elements')"
            disabled={isGenerating}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400">
            {prompt.length}/1000
          </div>
        </div>
        
        {/* Contextual Prompt Button */}
        {article && (
          <button
            onClick={generateContextualPrompt}
            className="mt-2 px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
          >
            🎯 Generate prompt from article
          </button>
        )}
      </div>

      {/* Preset Prompts */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Prompts
        </label>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_PROMPTS.map((presetPrompt, index) => (
            <button
              key={index}
              onClick={() => handlePresetPrompt(presetPrompt)}
              className="text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            >
              "{presetPrompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Style Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Style
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {STYLES.map((styleOption) => (
            <button
              key={styleOption.id}
              onClick={() => setStyle(styleOption.id)}
              disabled={isGenerating}
              className={`p-3 rounded-lg border transition-colors text-left ${
                style === styleOption.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{styleOption.icon}</span>
                <span className="text-sm font-medium">{styleOption.label}</span>
              </div>
              <div className="text-xs opacity-70">{styleOption.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Image Size
        </label>
        <div className="grid grid-cols-1 gap-2">
          {SIZES.map((sizeOption) => (
            <button
              key={sizeOption.id}
              onClick={() => setSize(sizeOption.id)}
              disabled={isGenerating}
              className={`p-3 rounded-lg border transition-colors text-left ${
                size === sizeOption.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sizeOption.icon}</span>
                  <span className="text-sm font-medium">{sizeOption.label}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{sizeOption.aspect}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              🎨 Generating image with DALL-E 3...
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {generationProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>🎨</span>
            <span>Generate Image</span>
          </>
        )}
      </button>

      {/* Info */}
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
          ℹ️ About AI Image Generation
        </h4>
        <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
          <div>• Powered by OpenAI DALL-E 3 for highest quality results</div>
          <div>• Generated images are unique and created specifically for your content</div>
          <div>• Generation typically takes 10-30 seconds</div>
          <div>• Be descriptive in your prompts for better results</div>
        </div>
      </div>
    </div>
  );
}





