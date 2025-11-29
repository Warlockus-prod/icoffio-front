'use client';

import { useEffect } from 'react';
import { type ImageType } from '@/lib/stores/admin-store';

interface ImagePreviewProps {
  image: ImageType | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: ImageType) => void;
  isSelected?: boolean;
}

export default function ImagePreview({ image, isOpen, onClose, onSelect, isSelected = false }: ImagePreviewProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) {
    return null;
  }

  const downloadImage = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.source}-${image.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded-full text-white font-medium ${
              image.source === 'unsplash' ? 'bg-green-500' : 'bg-purple-500'
            }`}>
              {image.source === 'unsplash' ? '📷 Unsplash' : '🤖 AI Generated'}
            </span>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {image.description || 'Untitled'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                by {image.author}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[400px] max-h-[60vh]">
          <img
            src={image.url}
            alt={image.description}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Image Info */}
        <div className="p-6 space-y-4">
          {/* Technical Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                Dimensions
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {image.width} × {image.height}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                Aspect Ratio
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {image.aspectRatio}:1
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                Source
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {image.source === 'unsplash' ? 'Unsplash' : 'OpenAI DALL-E'}
              </div>
            </div>

            {image.source === 'unsplash' && 'likes' in image && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Likes
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {image.likes || 0}
                </div>
              </div>
            )}
          </div>

          {/* Tags (if available) */}
          {image.tags && image.tags.length > 0 && (
            <div>
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-2">
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {image.tags.slice(0, 10).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Generation Details */}
          {image.source === 'openai' && 'prompt' in image && (
            <div>
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-2">
                Generation Prompt
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {image.prompt}
              </div>
              {'style' in image && image.style && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Style: {image.style} • Model: {image.model || 'DALL-E 3'}
                </div>
              )}
            </div>
          )}

          {/* Author Attribution */}
          {image.source === 'unsplash' && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Photo by <a
                href={image.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {image.author}
              </a> on <a
                href="https://unsplash.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Unsplash
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isSelected ? '✓ Selected for article' : 'Click select to use this image'}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={downloadImage}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                📥 Download
              </button>
              
              <button
                onClick={() => onSelect(image)}
                className={`px-6 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isSelected
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSelected ? '✓ Selected' : 'Select Image'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
















