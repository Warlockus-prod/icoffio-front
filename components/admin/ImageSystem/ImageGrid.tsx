'use client';

import { useState } from 'react';
import { useAdminStore, type ImageType } from '@/lib/stores/admin-store';

interface ImageGridProps {
  images: ImageType[];
  selectedImageId?: string;
  onImageSelect: (image: ImageType) => void;
  onImagePreview: (image: ImageType) => void;
  isLoading?: boolean;
}

export default function ImageGrid({ 
  images, 
  selectedImageId, 
  onImageSelect, 
  onImagePreview,
  isLoading = false 
}: ImageGridProps) {
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

  const handleImageError = (imageId: string) => {
    setImageLoadErrors(prev => new Set([...prev, imageId]));
  };

  const handleImageLoad = (imageId: string) => {
    setImageLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse">
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🖼️</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Images Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Try a different search term or generate images with AI
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => {
        const isSelected = selectedImageId === image.id;
        const hasError = imageLoadErrors.has(image.id);
        const isHovered = hoveredImageId === image.id;

        return (
          <div
            key={image.id}
            className={`relative group aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 shadow-lg'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
            }`}
            onMouseEnter={() => setHoveredImageId(image.id)}
            onMouseLeave={() => setHoveredImageId(null)}
          >
            {!hasError ? (
              <img
                src={image.thumbnail}
                alt={image.description}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={() => handleImageError(image.id)}
                onLoad={() => handleImageLoad(image.id)}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Failed to load
                  </div>
                </div>
              </div>
            )}

            {/* Overlay */}
            <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 ${
              isSelected ? 'bg-opacity-10' : ''
            }`} />

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}

            {/* Source badge */}
            <div className="absolute top-2 left-2">
              <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
                image.source === 'unsplash' 
                  ? 'bg-green-500' 
                  : 'bg-purple-500'
              }`}>
                {image.source === 'unsplash' ? '📷 Unsplash' : '🤖 AI'}
              </span>
            </div>

            {/* Action buttons on hover */}
            {(isHovered || isSelected) && (
              <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageSelect(image);
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {isSelected ? '✓ Selected' : 'Select'}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImagePreview(image);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-900 bg-opacity-75 text-white rounded hover:bg-opacity-90 transition-colors"
                >
                  👁️
                </button>
              </div>
            )}

            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="text-white text-xs">
                <div className="font-medium truncate mb-1">
                  {image.description || 'Untitled'}
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>{image.author}</span>
                  <span>{image.width}×{image.height}</span>
                </div>
              </div>
            </div>

            {/* Click handler for the entire image */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={() => onImageSelect(image)}
            />
          </div>
        );
      })}
    </div>
  );
}






