'use client';

import { useState, useRef, useCallback } from 'react';
import { ImageOption } from '@/lib/stores/admin-store';
import toast from 'react-hot-toast';

/**
 * 🖼️ IMAGE SELECTION MODAL v8.2.0
 * 
 * Features:
 * - До 5 изображений одновременно
 * - Unsplash фото (📷)
 * - AI генерация DALL-E (🤖)
 * - Загрузка с компьютера (📤)
 * - Drag & Drop поддержка
 * - Сжатие и оптимизация для web
 * 
 * Логика распределения:
 * - Изображение #1 = Hero (заглавное)
 * - Изображения #2-5 = Распределяются в контент
 */

interface ImageSelectionModalProps {
  isOpen: boolean;
  articleId: string;
  articleTitle: string;
  unsplashOptions: ImageOption[];
  aiOptions: ImageOption[];
  onSelect: (optionIds: string[], uploadedImages?: UploadedImage[]) => void;
  onSkip: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}

// Тип для загруженных изображений
interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  uploadedUrl?: string; // URL в Vercel Blob после загрузки
  blurDataUrl?: string; // Blur placeholder для Progressive loading
  size: number;
  originalSize: number;
  width?: number;
  height?: number;
  isUploading?: boolean;
  isUploaded?: boolean;
  uploadError?: string;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
  // Use ordered array instead of Set to maintain order
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'unsplash' | 'ai' | 'upload' | 'selected'>('unsplash');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSelected = selectedOrder.length + uploadedImages.length;
  
  // Create a Set for quick lookup
  const selectedIds = new Set(selectedOrder);

  if (!isOpen) return null;

  // ✅ Toggle выбора картинки
  const toggleImageSelection = (optionId: string) => {
    setSelectedOrder(prev => {
      if (prev.includes(optionId)) {
        // Remove
        return prev.filter(id => id !== optionId);
      } else {
        // Add
        if (prev.length + uploadedImages.length >= MAX_IMAGES) {
          toast.error(`❌ Maximum ${MAX_IMAGES} images!`);
          return prev;
        }
        return [...prev, optionId];
      }
    });
  };
  
  // ✅ Move image up/down in order
  const moveImage = (optionId: string, direction: 'up' | 'down') => {
    setSelectedOrder(prev => {
      const index = prev.indexOf(optionId);
      if (index === -1) return prev;
      
      const newOrder = [...prev];
      if (direction === 'up' && index > 0) {
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      } else if (direction === 'down' && index < prev.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      return newOrder;
    });
  };
  
  // ✅ Move uploaded image up/down
  const moveUploadedImage = (imageId: string, direction: 'up' | 'down') => {
    setUploadedImages(prev => {
      const index = prev.findIndex(img => img.id === imageId);
      if (index === -1) return prev;
      
      const newOrder = [...prev];
      if (direction === 'up' && index > 0) {
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      } else if (direction === 'down' && index < prev.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      return newOrder;
    });
  };

  // ✅ Загрузка файла в Vercel Blob
  const uploadToBlob = useCallback(async (uploadedImage: UploadedImage): Promise<UploadedImage> => {
    try {
      // Оптимизируем и загружаем
      const formData = new FormData();
      formData.append('file', uploadedImage.file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      
      return {
        ...uploadedImage,
        uploadedUrl: result.url,
        blurDataUrl: result.blurDataUrl,
        isUploading: false,
        isUploaded: true
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        ...uploadedImage,
        isUploading: false,
        isUploaded: false,
        uploadError: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }, []);

  // ✅ Обработка загрузки файлов
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      // Проверка типа
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`❌ Unsupported format: ${file.name}`);
        continue;
      }
      
      // Проверка размера
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`❌ File too large: ${file.name} (max 10MB)`);
        continue;
      }
      
      // Проверка лимита
      if (totalSelected + uploadedImages.length >= MAX_IMAGES) {
        toast.error(`❌ Limit of ${MAX_IMAGES} images reached`);
        break;
      }
      
      // Создаём preview
      const preview = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = async () => {
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Добавляем с флагом загрузки
        const newImage: UploadedImage = {
          id: uploadId,
          file,
          preview,
          size: file.size,
          originalSize: file.size,
          width: img.width,
          height: img.height,
          isUploading: true,
          isUploaded: false
        };
        
        setUploadedImages(prev => {
          if (prev.length + selectedOrder.length >= MAX_IMAGES) {
            toast.error(`❌ Limit of ${MAX_IMAGES} images reached`);
            return prev;
          }
          return [...prev, newImage];
        });
        
        // Загружаем в Vercel Blob
        const toastId = toast.loading(`📤 Uploading ${file.name}...`);
        
        const uploaded = await uploadToBlob(newImage);
        
        // Обновляем состояние
        setUploadedImages(prev => 
          prev.map(img => img.id === uploadId ? uploaded : img)
        );
        
        if (uploaded.isUploaded) {
          toast.success(`✅ ${file.name} uploaded to CDN!`, { id: toastId });
        } else {
          toast.error(`❌ Error: ${uploaded.uploadError}`, { id: toastId });
        }
      };
      
      img.src = preview;
    }
  }, [totalSelected, selectedOrder.length, uploadedImages.length, uploadToBlob]);

  // ✅ Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // ✅ Удаление загруженного изображения
  const removeUploadedImage = (id: string) => {
    setUploadedImages(prev => {
      const toRemove = prev.find(img => img.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // ✅ Применить выбранные изображения
  const handleApplySelection = async () => {
    if (totalSelected === 0) {
      toast.error('❌ Select at least one image!');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Pass ordered array (not Set) to maintain selection order
      onSelect(selectedOrder, uploadedImages);
      toast.success(`✅ ${totalSelected} images selected!`);
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Failed to select images:', error);
      toast.error('❌ Error selecting images');
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
      toast.success('✅ New options ready!');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Получить номер позиции для выбранного изображения
  const getSelectionOrder = (id: string): number | null => {
    const allSelectedIds = [...selectedOrder, ...uploadedImages.map(img => img.id)];
    const index = allSelectedIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  };
  
  // Get all selected images info for reordering display
  const getAllSelectedImages = () => {
    const allOptions = [...unsplashOptions, ...aiOptions];
    return selectedOrder.map(id => allOptions.find(opt => opt.id === id)).filter(Boolean);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-start justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🖼️ Select Images
                <span className="text-sm font-normal bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  up to {MAX_IMAGES}
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                for article: "{articleTitle.substring(0, 50)}{articleTitle.length > 50 ? '...' : ''}"
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="w-5 h-5 bg-amber-500 text-white rounded flex items-center justify-center font-bold">1</span>
                  = Hero (main)
                </span>
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span className="w-5 h-5 bg-gray-400 text-white rounded flex items-center justify-center font-bold">2-5</span>
                  = In article content
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab('unsplash')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'unsplash'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📷 Unsplash ({unsplashOptions.length})
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            🤖 AI ({aiOptions.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📤 Upload ({uploadedImages.length})
          </button>
          {totalSelected > 0 && (
            <button
              onClick={() => setActiveTab('selected')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'selected'
                  ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ⭐ Selected ({totalSelected})
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Unsplash Tab */}
          {activeTab === 'unsplash' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {unsplashOptions.map((option) => (
                  <ImageCard
                    key={option.id}
                    option={option}
                  isSelected={selectedIds.has(option.id)}
                  selectionOrder={getSelectionOrder(option.id)}
                  onSelect={() => toggleImageSelection(option.id)}
                  disabled={!selectedIds.has(option.id) && totalSelected >= MAX_IMAGES}
                  />
                ))}
              {unsplashOptions.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl mb-4 block">📷</span>
                  No Unsplash images available
              </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiOptions.map((option) => (
                  <ImageCard
                    key={option.id}
                    option={option}
                  isSelected={selectedIds.has(option.id)}
                  selectionOrder={getSelectionOrder(option.id)}
                  onSelect={() => toggleImageSelection(option.id)}
                  disabled={!selectedIds.has(option.id) && totalSelected >= MAX_IMAGES}
                  />
                ))}
              {aiOptions.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl mb-4 block">🤖</span>
                  No AI-generated images available
              </div>
              )}
            </div>
          )}

          {/* Selected Images Tab - for reordering */}
          {activeTab === 'selected' && (
            <div>
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">📋 Reorder Selected Images</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Use ↑/↓ arrows to change order. Image #1 will be the Hero (main) image.
                </p>
              </div>
              
              {totalSelected === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl mb-4 block">📭</span>
                  No images selected yet
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected from Unsplash/AI */}
                  {selectedOrder.map((id, index) => {
                    const option = [...unsplashOptions, ...aiOptions].find(opt => opt.id === id);
                    if (!option) return null;
                    
                    const globalIndex = index;
                    const isHero = globalIndex === 0 && uploadedImages.length === 0;
                    
                    return (
                      <div 
                        key={id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                          isHero ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {/* Order Number */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          isHero ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>
                          {globalIndex + 1}
                        </div>
                        
                        {/* Thumbnail */}
                        <img 
                          src={option.thumbnail || option.url} 
                          alt="" 
                          className="w-20 h-14 object-cover rounded-lg"
                        />
                        
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              option.source === 'unsplash' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {option.source === 'unsplash' ? '📷 Unsplash' : '🤖 AI'}
                            </span>
                            {isHero && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">⭐ Hero</span>}
                          </div>
                          {option.author && <p className="text-xs text-gray-500 mt-1">by {option.author}</p>}
                        </div>
                        
                        {/* Reorder Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveImage(id, 'up')}
                            disabled={index === 0}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveImage(id, 'down')}
                            disabled={index === selectedOrder.length - 1}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => toggleImageSelection(id)}
                            className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 flex items-center justify-center"
                            title="Remove"
                          >
                            ✕
            </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Uploaded Images */}
                  {uploadedImages.map((img, index) => {
                    const globalIndex = selectedOrder.length + index;
                    const isHero = globalIndex === 0;
                    
                    return (
                      <div 
                        key={img.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                          isHero ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {/* Order Number */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          isHero ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>
                          {globalIndex + 1}
                        </div>
                        
                        {/* Thumbnail */}
                        <img 
                          src={img.preview} 
                          alt="" 
                          className="w-20 h-14 object-cover rounded-lg"
                        />
                        
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">📤 Uploaded</span>
                            {isHero && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">⭐ Hero</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{img.file.name} • {(img.size / 1024).toFixed(0)}KB</p>
                        </div>
                        
                        {/* Reorder Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveUploadedImage(img.id, 'up')}
                            disabled={index === 0 && selectedOrder.length === 0}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveUploadedImage(img.id, 'down')}
                            disabled={index === uploadedImages.length - 1}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeUploadedImage(img.id)}
                            className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 flex items-center justify-center"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <div className="text-5xl mb-4">📤</div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Drag files here or click to upload
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Supported: JPG, PNG, WebP, GIF (up to 10MB)
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Images will be automatically optimized for web
                </p>
              </div>

              {/* Uploaded Images Grid */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Uploaded files ({uploadedImages.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map((img, index) => (
                      <div
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg"
                      >
                        <img
                          src={img.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        
                        {/* Order Badge */}
                        <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                          selectedOrder.length + index === 0 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>
                          {selectedOrder.length + index + 1}
                        </div>
                        
                        {/* Reorder Buttons */}
                        <div className="absolute top-2 right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveUploadedImage(img.id, 'up'); }}
                              className="w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow"
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {index < uploadedImages.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveUploadedImage(img.id, 'down'); }}
                              className="w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow"
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removeUploadedImage(img.id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                        
                        {/* File Info */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-xs truncate">{img.file.name}</p>
                          <p className="text-white/70 text-xs">
                            {img.width}×{img.height} • {(img.size / 1024).toFixed(0)}KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex gap-3">
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
              🔄 New Options
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
            {/* Selection Counter */}
            <div className="flex items-center gap-2">
              {Array.from({ length: MAX_IMAGES }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < totalSelected
                      ? i === 0 ? 'bg-amber-500' : 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                {totalSelected}/{MAX_IMAGES}
              </span>
            </div>
            
            <button
              onClick={handleApplySelection}
              disabled={isLoading || totalSelected === 0}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Применяем...
                </>
              ) : (
                <>✓ Применить ({totalSelected})</>
              )}
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
  selectionOrder: number | null;
  onSelect: () => void;
  disabled?: boolean;
}

function ImageCard({ option, isSelected, selectionOrder, onSelect, disabled }: ImageCardProps) {
  return (
    <div
      onClick={disabled && !isSelected ? undefined : onSelect}
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800'
          : disabled
          ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
        <img
          src={option.thumbnail || option.url}
          alt={option.description || 'Image option'}
          className="w-full h-full object-cover"
        />
        
        {/* Selection Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg">
            ✓ Selected
            </div>
          </div>
        )}

        {/* Order Badge */}
        {selectionOrder && (
          <div className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
            selectionOrder === 1 ? 'bg-amber-500' : 'bg-blue-500'
          }`}>
            {selectionOrder}
      </div>
        )}

        {/* Source Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-medium shadow ${
              option.source === 'unsplash'
              ? 'bg-green-500 text-white'
              : 'bg-purple-500 text-white'
          }`}>
            {option.source === 'unsplash' ? '📷' : '🤖'}
          </span>
        </div>
            </div>

      {/* Metadata */}
      <div className="p-3 bg-white dark:bg-gray-800">
        {option.source === 'unsplash' && option.author && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            by {option.author}
          </p>
            )}
        {option.source === 'ai' && option.prompt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {option.prompt.substring(0, 50)}...
          </p>
        )}
      </div>
    </div>
  );
}
