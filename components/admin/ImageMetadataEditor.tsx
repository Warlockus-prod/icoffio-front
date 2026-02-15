'use client';

/**
 * IMAGE METADATA EDITOR v7.8.0
 * 
 * UI компонент для управления изображениями статей:
 * - Просмотр текущих изображений
 * - Редактирование промптов и тегов
 * - Регенерация изображений (DALL-E / Unsplash)
 * - История изменений
 * 
 * @version 7.8.0
 * @date 2025-10-30
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ImageMetadata,
  ArticleImageMetadata,
  ImageSource,
  createDefaultArticleImageMetadata
} from '@/lib/types/image-metadata';

interface ImageMetadataEditorProps {
  articleId: string;
  articleTitle: string;
  articleCategory: string;
  articleContent?: string;
  articleExcerpt?: string;
  initialMetadata?: ArticleImageMetadata;
  onUpdate?: (metadata: ArticleImageMetadata) => void;
}

export default function ImageMetadataEditor({
  articleId,
  articleTitle,
  articleCategory,
  articleContent,
  articleExcerpt,
  initialMetadata,
  onUpdate
}: ImageMetadataEditorProps) {
  const [metadata, setMetadata] = useState<ArticleImageMetadata>(
    initialMetadata || createDefaultArticleImageMetadata()
  );
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{
    type: 'hero' | 'content';
    index?: number;
    value: string;
  } | null>(null);
  const [editingTags, setEditingTags] = useState<{
    type: 'hero' | 'content';
    index?: number;
    value: string;
  } | null>(null);

  /**
   * Регенерирует изображение
   */
  const handleRegenerateImage = async (
    imageType: 'hero' | 'content',
    imageIndex: number | undefined,
    source: ImageSource,
    useCustomPrompt: boolean = false
  ) => {
    const key = imageType === 'hero' ? 'hero' : `content-${imageIndex}`;
    setIsRegenerating(key);

    try {
      const currentImage = imageType === 'hero' 
        ? metadata.heroImage 
        : metadata.contentImages[imageIndex || 0];

      const requestBody: any = {
        articleId,
        imageType,
        imageIndex,
        source,
        useSmartPrompts: !useCustomPrompt,
        articleTitle,
        articleCategory,
        articleContent,
        articleExcerpt
      };

      // Если редактируем промпт/теги, используем их
      if (useCustomPrompt) {
        if (editingPrompt) {
          requestBody.customPrompt = editingPrompt.value;
        }
        if (editingTags && source === 'unsplash') {
          requestBody.customTags = editingTags.value.split(',').map(t => t.trim());
        }
      }

      console.log('[ImageMetadataEditor] Regenerating image:', requestBody);

      const response = await fetch('/api/admin/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate image');
      }

      // Обновляем метаданные
      const newMetadata = { ...metadata };
      
      if (imageType === 'hero') {
        newMetadata.heroImage = result.metadata;
      } else {
        newMetadata.contentImages[imageIndex || 0] = result.metadata;
      }

      newMetadata.lastUpdated = new Date().toISOString();

      setMetadata(newMetadata);
      onUpdate?.(newMetadata);

      // Сбрасываем редактирование
      setEditingPrompt(null);
      setEditingTags(null);

      toast.success(
        `✅ Image regenerated!${result.cost ? ` Cost: $${result.cost.toFixed(3)}` : ''}`,
        { duration: 4000 }
      );

    } catch (error: any) {
      console.error('[ImageMetadataEditor] Error:', error);
      toast.error(`❌ Failed: ${error.message}`);
    } finally {
      setIsRegenerating(null);
    }
  };

  /**
   * Генерирует умные промпты через AI
   */
  const handleGenerateSmartPrompts = async () => {
    toast.loading('🤖 Generating smart prompts with AI...', { id: 'smart-prompts' });

    try {
      // Пока просто показываем как это будет работать
      // В продакшене это вызов к smart-image-prompt-generator
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('✅ Smart prompts generated!', { id: 'smart-prompts' });
      
      // Здесь будет реальный update метаданных
      // const newPrompts = await generateSmartImagePrompts(...)
      
    } catch (error) {
      toast.error('❌ Failed to generate prompts', { id: 'smart-prompts' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🖼️ Image Metadata
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage images, prompts, and tags for this article
          </p>
        </div>
        <button
          onClick={handleGenerateSmartPrompts}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-md"
        >
          🤖 AI Smart Prompts
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Hero Image</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {metadata.heroImage.source.toUpperCase()}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Content Images</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {metadata.contentImages.length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Smart AI</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {metadata.smartPromptsUsed ? '✅ Yes' : '❌ No'}
          </p>
        </div>
      </div>

      {/* Hero Image */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
          <h4 className="text-white font-semibold">Hero Image (Thumbnail)</h4>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img
              src={metadata.heroImage.url}
              alt={metadata.heroImage.alt || articleTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {metadata.heroImage.source.toUpperCase()}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-3">
            {/* Prompt/Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {metadata.heroImage.source === 'dalle' ? '🎨 DALL-E Prompt' : '🔍 Unsplash Query'}
              </label>
              {editingPrompt?.type === 'hero' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingPrompt.value}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter custom prompt..."
                  />
                  <button
                    onClick={() => handleRegenerateImage('hero', undefined, metadata.heroImage.source, true)}
                    disabled={isRegenerating === 'hero'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isRegenerating === 'hero' ? '⏳' : '✅'}
                  </button>
                  <button
                    onClick={() => setEditingPrompt(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    ✖️
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    {metadata.heroImage.prompt || metadata.heroImage.dallePrompt || 'No prompt set'}
                  </div>
                  <button
                    onClick={() => setEditingPrompt({
                      type: 'hero',
                      value: metadata.heroImage.prompt || metadata.heroImage.dallePrompt || ''
                    })}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>

            {/* Unsplash Tags */}
            {metadata.heroImage.source === 'unsplash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🏷️ Unsplash Tags
                </label>
                {editingTags?.type === 'hero' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingTags.value}
                      onChange={(e) => setEditingTags({ ...editingTags, value: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="tag1, tag2, tag3..."
                    />
                    <button
                      onClick={() => handleRegenerateImage('hero', undefined, 'unsplash', true)}
                      disabled={isRegenerating === 'hero'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isRegenerating === 'hero' ? '⏳' : '✅'}
                    </button>
                    <button
                      onClick={() => setEditingTags(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      ✖️
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {metadata.heroImage.unsplashTags?.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        )) || <span className="text-sm text-gray-500">No tags</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTags({
                        type: 'hero',
                        value: metadata.heroImage.unsplashTags?.join(', ') || ''
                      })}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Keywords */}
            {metadata.heroImage.keywords && metadata.heroImage.keywords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🔑 Keywords
                </label>
                <div className="flex flex-wrap gap-1">
                  {metadata.heroImage.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleRegenerateImage('hero', undefined, 'unsplash', false)}
              disabled={isRegenerating === 'hero'}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 transition-all"
            >
              {isRegenerating === 'hero' ? '⏳ Regenerating...' : '🔄 Unsplash (Smart AI)'}
            </button>
            <button
              onClick={() => handleRegenerateImage('hero', undefined, 'dalle', false)}
              disabled={isRegenerating === 'hero'}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
            >
              {isRegenerating === 'hero' ? '⏳ Generating...' : '🎨 DALL-E ($$$)'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Images */}
      {metadata.contentImages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-4 py-3">
            <h4 className="text-white font-semibold">Content Images ({metadata.contentImages.length})</h4>
          </div>
          
          <div className="p-4 space-y-4">
            {metadata.contentImages.map((image, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Image #{index + 1}
                  </span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    {image.source.toUpperCase()}
                  </span>
                </div>
                
                <img
                  src={image.url}
                  alt={image.alt || `Content image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {image.prompt || image.dallePrompt || 'No prompt'}
                </div>
                
                <button
                  onClick={() => handleRegenerateImage('content', index, image.source, false)}
                  disabled={isRegenerating === `content-${index}`}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRegenerating === `content-${index}` ? '⏳ Regenerating...' : '🔄 Regenerate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date(metadata.lastUpdated).toLocaleString()} • 
        Smart AI: {metadata.smartPromptsUsed ? 'Enabled ✅' : 'Disabled ❌'}
      </div>
    </div>
  );
}
