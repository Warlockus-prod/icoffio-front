'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, type ImageType } from '@/lib/stores/admin-store';

interface ImageSearchProps {
  onImagesFound: (images: ImageType[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  initialQuery?: string;
}

const PRESET_QUERIES = [
  { id: 'ai', label: 'AI & Technology', icon: '🤖', query: 'artificial intelligence technology' },
  { id: 'apple', label: 'Apple Products', icon: '🍎', query: 'apple iphone mac technology' },
  { id: 'tech', label: 'Technology', icon: '⚙️', query: 'technology innovation modern' },
  { id: 'digital', label: 'Digital', icon: '📱', query: 'digital transformation modern' },
  { id: 'business', label: 'Business', icon: '💼', query: 'business professional modern' },
  { id: 'startup', label: 'Startup', icon: '🚀', query: 'startup innovation entrepreneur' }
];

const ORIENTATIONS = [
  { id: 'landscape', label: 'Landscape', icon: '🖼️' },
  { id: 'portrait', label: 'Portrait', icon: '📱' },
  { id: 'squarish', label: 'Square', icon: '⬜' }
];

export default function ImageSearch({ onImagesFound, onLoadingChange, initialQuery = '' }: ImageSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [orientation, setOrientation] = useState('landscape');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  
  // Debounced search
  useEffect(() => {
    if (query.trim()) {
      const searchTimeout = setTimeout(() => {
        handleSearch(true);
      }, 500);

      return () => clearTimeout(searchTimeout);
    }
  }, [query, orientation]);

  const handleSearch = async (isNewSearch = false) => {
    if (!query.trim() || isSearching) return;

    const page = isNewSearch ? 1 : currentPage;
    setIsSearching(true);
    onLoadingChange(true);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/images?q=${encodeURIComponent(query)}&page=${page}&orientation=${orientation}&per_page=12`
      );
      
      const result = await response.json();
      
      if (result.success) {
        if (isNewSearch) {
          onImagesFound(result.images);
          setCurrentPage(2);
        } else {
          // Load more functionality would go here
          // For now, just replace images
          onImagesFound(result.images);
        }
        
        setHasMore(page < result.totalPages);
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      console.error('Image search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      onImagesFound([]);
    } finally {
      setIsSearching(false);
      onLoadingChange(false);
    }
  };

  const handlePresetQuery = (presetQuery: string) => {
    setQuery(presetQuery);
    setCurrentPage(1);
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          📷 Image Search
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Search high-quality images from Unsplash or generate custom images with AI
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search for images... (e.g., 'technology', 'artificial intelligence')"
            className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            ) : (
              <span className="text-gray-400">🔍</span>
            )}
          </div>
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <span>⚠️</span>
            {error}
          </p>
        )}
      </div>

      {/* Preset Queries */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Searches
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetQuery(preset.query)}
              className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                query === preset.query
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{preset.icon}</span>
                <span className="text-sm font-medium">{preset.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Orientation Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Image Orientation
        </label>
        <div className="flex gap-2">
          {ORIENTATIONS.map((orient) => (
            <button
              key={orient.id}
              onClick={() => setOrientation(orient.id)}
              className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                orientation === orient.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{orient.icon}</span>
                <span>{orient.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search Stats */}
      {query && !isSearching && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Current search:</span> "{query}" • 
            <span className="font-medium"> Orientation:</span> {orientation} • 
            <span className="font-medium"> Source:</span> Unsplash
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
          💡 Search Tips
        </h4>
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <div>• Use specific keywords: "artificial intelligence" instead of just "AI"</div>
          <div>• Try different orientations for better results</div>
          <div>• All images are high-quality and free to use</div>
          <div>• Search is automatically updated as you type</div>
        </div>
      </div>
    </div>
  );
}







