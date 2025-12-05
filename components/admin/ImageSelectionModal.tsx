'use client';

import { useState } from 'react';
import { ImageOption } from '@/lib/stores/admin-store';
import toast from 'react-hot-toast';

interface ImageSelectionModalProps {
  isOpen: boolean;
  articleId: string;
  articleTitle: string;
  unsplashOptions: ImageOption[];
  aiOptions: ImageOption[];
  onSelect: (optionIds: string[]) => void; // ✅ ИСПРАВЛЕНО: принимаем массив ID!
  onSkip: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export default function ImageSelectionModal({
  isOpen,
  articleId,
  articleTitle,
  unsplashOptions,
  aiOptions,
  onSelect,
  onSkip,
  onRegenerate,
  onClose
}: ImageSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // ✅ ИСПРАВЛЕНО: Set для множественного выбора!
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // ✅ ИСПРАВЛЕНО: Toggle выбора картинки (можно выбрать несколько)
  const toggleImageSelection = (optionId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId); // Убираем если уже выбрана
      } else {
        if (newSet.size >= 3) {
          toast.error('❌ Максимум 3 изображения!');
          return prev;
        }
        newSet.add(optionId); // Добавляем
      }
      return newSet;
    });
  };

  // Применить выбранные изображения
  const handleApplySelection = async () => {
    if (selectedIds.size === 0) {
      toast.error('❌ Выберите хотя бы одно изображение!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      onSelect(Array.from(selectedIds)); // Передаем массив выбранных ID
      toast.success(`✅ ${selectedIds.size} изображений выбрано!`);
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Failed to select images:', error);
      toast.error('❌ Failed to select images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    toast.success('⏭️ Image selection skipped');
    onClose();
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    toast.loading('🔄 Generating new options...');
    
    try {
      await onRegenerate();
      toast.dismiss();
      toast.success('✅ New options generated!');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Failed to regenerate options');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🎨 Выбери изображения (1-3 шт)
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                для статьи: "{articleTitle.substring(0, 60)}{articleTitle.length > 60 ? '...' : ''}"
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💡 Кликай на картинки чтобы выбрать. Можно выбрать до 3 изображений.
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Unsplash Options */}
          {unsplashOptions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                📷 Unsplash Images
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  (Professional Photography)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {unsplashOptions.map((option) => (
                  <ImageCard
                    key={option.id}
                    option={option}
                    isSelected={selectedIds.has(option.id)} // ✅ ИСПРАВЛЕНО: проверяем в Set
                    onSelect={() => toggleImageSelection(option.id)} // ✅ ИСПРАВЛЕНО: toggle вместо direct select
                    isLoading={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI Generated Options */}
          {aiOptions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🤖 AI Generated Images
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  (DALL-E 3)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiOptions.map((option) => (
                  <ImageCard
                    key={option.id}
                    option={option}
                    isSelected={selectedIds.has(option.id)} // ✅ ИСПРАВЛЕНО
                    onSelect={() => toggleImageSelection(option.id)} // ✅ ИСПРАВЛЕНО
                    isLoading={false}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              ⏭️ Skip
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size > 0 ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  ✓ {selectedIds.size} выбрано (макс. 3)
                </span>
              ) : (
                <span>{unsplashOptions.length + aiOptions.length} доступно</span>
              )}
            </div>
            <button
              onClick={handleApplySelection}
              disabled={isLoading || selectedIds.size === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
            >
              {isLoading ? '⏳ Применяем...' : `✓ Применить (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// IMAGE CARD COMPONENT
// ============================================================================

interface ImageCardProps {
  option: ImageOption;
  isSelected: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

function ImageCard({ option, isSelected, onSelect, isLoading }: ImageCardProps) {
  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-blue-500 dark:border-blue-400 shadow-lg'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        <img
          src={option.thumbnail || option.url}
          alt={option.description || 'Image option'}
          className="w-full h-full object-cover"
        />
        
        {/* Click overlay для выбора */}
        <div 
          onClick={onSelect}
          className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity cursor-pointer flex items-center justify-center"
        >
          {isSelected && (
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold">
              ✓ Выбрано
            </div>
          )}
        </div>

        {/* Selected Badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
            ✓
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-4 bg-white dark:bg-gray-800">
        {/* Source Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              option.source === 'unsplash'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
            }`}
          >
            {option.source === 'unsplash' ? '📷 Unsplash' : '🤖 AI Generated'}
          </span>
        </div>

        {/* Unsplash: Query + Author */}
        {option.source === 'unsplash' && (
          <>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="font-medium">Query:</span> "{option.searchQuery}"
            </div>
            {option.author && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Photo by {option.authorUrl ? (
                  <a
                    href={option.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {option.author}
                  </a>
                ) : (
                  option.author
                )}
              </div>
            )}
          </>
        )}

        {/* AI: Prompt */}
        {option.source === 'ai' && option.prompt && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Prompt:</span> {option.prompt.substring(0, 80)}
            {option.prompt.length > 80 && '...'}
          </div>
        )}

        {/* Select Button (mobile) - Toggle режим */}
        <button
          onClick={onSelect}
          className={`mt-3 w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium md:hidden ${
            isSelected 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {isSelected ? '✓ Выбрано' : 'Выбрать'}
        </button>
      </div>
    </div>
  );
}





