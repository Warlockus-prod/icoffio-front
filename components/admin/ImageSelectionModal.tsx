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
  onSelect: (optionId: string) => void;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (optionId: string) => {
    setSelectedId(optionId);
    setIsLoading(true);
    
    try {
      onSelect(optionId);
      toast.success('✅ Image selected successfully!');
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Failed to select image:', error);
      toast.error('❌ Failed to select image');
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
                🎨 Choose Image
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                for: "{articleTitle.substring(0, 60)}{articleTitle.length > 60 ? '...' : ''}"
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
                    isSelected={selectedId === option.id}
                    onSelect={() => handleSelect(option.id)}
                    isLoading={isLoading && selectedId === option.id}
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
                    isSelected={selectedId === option.id}
                    onSelect={() => handleSelect(option.id)}
                    isLoading={isLoading && selectedId === option.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Image / Custom Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* No Image Option */}
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-3">🚫</div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  No Image
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Continue without image
                </p>
              </div>
            </button>

            {/* Custom Upload Option */}
            <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-3">📤</div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Upload Custom
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
                  Coming soon
                </p>
                <button
                  disabled
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed text-sm"
                >
                  Not Available
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            🔄 Regenerate Options
          </button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {unsplashOptions.length + aiOptions.length} options available
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
        
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
          <button
            onClick={onSelect}
            disabled={isLoading}
            className="opacity-0 group-hover:opacity-100 transition-opacity px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Selecting...' : '✓ Select'}
          </button>
        </div>

        {/* Selected Badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            ✓ Selected
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

        {/* Select Button (mobile) */}
        <button
          onClick={onSelect}
          disabled={isLoading}
          className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium md:hidden"
        >
          {isLoading ? 'Selecting...' : isSelected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
}


