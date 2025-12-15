'use client';

import { useState } from 'react';
import { useAdminStore, type ImageType } from '@/lib/stores/admin-store';
import ImageSearch from './ImageSystem/ImageSearch';
import AIImageGenerator from './ImageSystem/AIImageGenerator';
import ImageGrid from './ImageSystem/ImageGrid';
import ImagePreview from './ImageSystem/ImagePreview';

export default function ImageSystem() {
  const { selectedArticle, availableImages, searchQuery, selectImage } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'search' | 'generate'>('search');
  const [images, setImages] = useState<ImageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<ImageType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const tabs = [
    { id: 'search', label: 'Search Images', icon: '🔍', description: 'Find images from Unsplash' },
    { id: 'generate', label: 'Generate AI Images', icon: '🤖', description: 'Create custom images with DALL-E' }
  ];

  const handleImagesFound = (foundImages: ImageType[]) => {
    setImages(foundImages);
  };

  const handleImageGenerated = (generatedImage: ImageType) => {
    setImages(prev => [generatedImage, ...prev]);
    setActiveTab('search'); // Switch back to show the generated image
  };

  const handleImageSelect = (image: ImageType) => {
    setSelectedImageId(image.id);
    if (selectedArticle) {
      selectImage(image.id);
    }
  };

  const handleImagePreview = (image: ImageType) => {
    setPreviewImage(image);
    setIsPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewImage(null);
    setIsPreviewOpen(false);
  };

  const handlePreviewSelect = (image: ImageType) => {
    handleImageSelect(image);
    handlePreviewClose();
  };

  // Get selected image details
  const selectedImage = images.find(img => img.id === selectedImageId);
  const hasSelectedImage = Boolean(selectedImage);

  return (
    <div className="space-y-6">
      {/* Header with Article Context */}
      {selectedArticle ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                🖼️ Select Image for Article
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                "{selectedArticle.title}" • {selectedArticle.category}
              </p>
            </div>
            
            {hasSelectedImage && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✓ Image selected
                </div>
                <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <img
                    src={selectedImage!.thumbnail || selectedImage!.url}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-4xl mb-4">🖼️</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Article Selected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Select an article from the editor to find or generate images
            </p>
            <button 
              onClick={() => useAdminStore.getState().setActiveTab('editor')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              📝 Go to Article Editor
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedArticle && (
        <>
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-600">
              <nav className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    <div className="text-xs text-center mt-1 opacity-70">
                      {tab.description}
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'search' ? (
                <ImageSearch
                  onImagesFound={handleImagesFound}
                  onLoadingChange={setIsLoading}
                  initialQuery={selectedArticle?.category || ''}
                />
              ) : (
                <AIImageGenerator
                  article={selectedArticle}
                  onImageGenerated={handleImageGenerated}
                />
              )}
            </div>
          </div>

          {/* Image Grid */}
          {(images.length > 0 || isLoading) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Image Gallery
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isLoading 
                      ? 'Loading images...' 
                      : `${images.length} images available • Click to select`
                    }
                  </p>
                </div>
                
                {hasSelectedImage && (
                  <button
                    onClick={() => setSelectedImageId(undefined)}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <ImageGrid
                images={images}
                selectedImageId={selectedImageId}
                onImageSelect={handleImageSelect}
                onImagePreview={handleImagePreview}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🖼️</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {images.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Available Images
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">📷</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {images.filter(img => img.source === 'unsplash').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Unsplash Photos
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🤖</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {images.filter(img => img.source === 'openai').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    AI Generated
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  hasSelectedImage 
                    ? 'bg-green-50 dark:bg-green-900/20' 
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}>
                  <span className={`text-lg ${
                    hasSelectedImage 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {hasSelectedImage ? '✅' : '⚪'}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {hasSelectedImage ? '1' : '0'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Selected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      <ImagePreview
        image={previewImage}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onSelect={handlePreviewSelect}
        isSelected={previewImage?.id === selectedImageId}
      />
    </div>
  );
}

