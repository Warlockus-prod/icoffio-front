'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminStore, type ImageType } from '@/lib/stores/admin-store';
import ImageSearch from './ImageSystem/ImageSearch';
import AIImageGenerator from './ImageSystem/AIImageGenerator';
import ImageGrid from './ImageSystem/ImageGrid';
import ImagePreview from './ImageSystem/ImagePreview';

// ─── Library image type ─────────────────────────────────
interface LibraryImage {
  id: number;
  image_url: string;
  thumbnail_url?: string;
  prompt: string;
  category?: string;
  source_type?: string;
  alt_text?: string;
  author?: string;
  usage_count?: number;
  created_at?: string;
}

export default function ImageSystem() {
  const { selectedArticle, availableImages, searchQuery, selectImage } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'generate'>('library');
  const [images, setImages] = useState<ImageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<ImageType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ── Library state ──
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySourceFilter, setLibrarySourceFilter] = useState('');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState('');
  const [librarySort, setLibrarySort] = useState('recent');
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotal, setLibraryTotal] = useState(0);

  const tabs = [
    { id: 'library', label: 'Image Library', icon: '📚', description: 'Saved images for reuse' },
    { id: 'search', label: 'Search Unsplash', icon: '🔍', description: 'Find images from Unsplash' },
    { id: 'generate', label: 'Generate AI', icon: '🤖', description: 'Create custom images with DALL-E' }
  ];

  // ─── Library loading ──────────────────────────────────
  const loadLibrary = useCallback(async (page = 1) => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '24',
        sort: librarySort,
      });
      if (librarySearch) params.set('q', librarySearch);
      if (librarySourceFilter) params.set('source_type', librarySourceFilter);
      if (libraryCategoryFilter) params.set('category', libraryCategoryFilter);

      const res = await fetch(`/api/admin/image-library?${params}`);
      const data = await res.json();
      if (data.success) {
        setLibraryImages(data.images || []);
        setLibraryTotal(data.total || 0);
        setLibraryPage(page);
      }
    } catch {
      // ignore
    } finally {
      setLibraryLoading(false);
    }
  }, [librarySearch, librarySourceFilter, libraryCategoryFilter, librarySort]);

  // Load library on tab switch or filter change
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary(1);
    }
  }, [activeTab, librarySort, librarySourceFilter, libraryCategoryFilter]);

  const handleLibrarySearch = () => {
    loadLibrary(1);
  };

  // ─── Existing handlers ────────────────────────────────
  const handleImagesFound = (foundImages: ImageType[]) => {
    setImages(foundImages);
  };

  const handleImageGenerated = (generatedImage: ImageType) => {
    setImages(prev => [generatedImage, ...prev]);
    setActiveTab('search');
  };

  const handleImageSelect = (image: ImageType) => {
    setSelectedImageIds(prev => {
      const isAlreadySelected = prev.includes(image.id);
      let next: string[];
      if (isAlreadySelected) {
        next = prev.filter(id => id !== image.id);
      } else if (prev.length >= 5) {
        next = [...prev.slice(0, 4), image.id];
      } else {
        next = [...prev, image.id];
      }
      if (selectedArticle && next.length > 0) {
        selectImage(next[0]);
      }
      return next;
    });
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

  const selectedImages = images.filter(img => selectedImageIds.includes(img.id));
  const hasSelectedImage = selectedImages.length > 0;

  // ─── Copy URL to clipboard ────────────────────────────
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Header — always visible now (library is article-independent) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              🖼️ Image Manager
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedArticle
                ? `Article: "${selectedArticle.title}" • ${selectedArticle.category}`
                : 'Browse your image library, search Unsplash, or generate AI images'}
            </p>
          </div>
          {libraryTotal > 0 && activeTab === 'library' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {libraryTotal} saved images
            </div>
          )}
        </div>
      </div>

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
                  {tab.id === 'library' && libraryTotal > 0 && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">
                      {libraryTotal}
                    </span>
                  )}
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
          {/* ── Library Tab ── */}
          {activeTab === 'library' && (
            <div>
              {/* Filters Row */}
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Search input */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLibrarySearch()}
                      placeholder="Search images..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={handleLibrarySearch}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Source filter */}
                <select
                  value={librarySourceFilter}
                  onChange={(e) => setLibrarySourceFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Sources</option>
                  <option value="unsplash">Unsplash</option>
                  <option value="dalle">DALL-E</option>
                  <option value="upload">Uploaded</option>
                  <option value="source">From Source</option>
                  <option value="manual">Manual URL</option>
                </select>

                {/* Category filter */}
                <select
                  value={libraryCategoryFilter}
                  onChange={(e) => setLibraryCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="ai">AI</option>
                  <option value="apple">Apple</option>
                  <option value="tech">Tech</option>
                  <option value="games">Games</option>
                </select>

                {/* Sort */}
                <select
                  value={librarySort}
                  onChange={(e) => setLibrarySort(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="recent">Newest First</option>
                  <option value="popular">Most Used</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Library Grid */}
              {libraryLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    Loading library...
                  </div>
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {librarySearch || librarySourceFilter || libraryCategoryFilter
                      ? 'No images match your filters'
                      : 'Your image library is empty'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                    {librarySearch || librarySourceFilter || libraryCategoryFilter
                      ? 'Try adjusting your search or filters'
                      : 'Images you select in the article editor (Unsplash, AI, upload) will automatically be saved here for future reuse.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {libraryImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <img
                          src={img.thumbnail_url || img.image_url}
                          alt={img.alt_text || img.prompt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect fill="%23374151" width="200" height="120"/><text x="100" y="65" text-anchor="middle" fill="%239CA3AF" font-size="12">Error</text></svg>';
                          }}
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => copyUrl(img.image_url)}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-900 rounded-lg text-xs font-medium transition-colors"
                          >
                            Copy URL
                          </button>
                          <a
                            href={img.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Open Full
                          </a>
                        </div>
                        {/* Bottom info strip */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                          <div className="text-white text-[10px] truncate">
                            {img.alt_text || img.prompt}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {img.source_type && img.source_type !== 'unknown' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white uppercase">
                                {img.source_type}
                              </span>
                            )}
                            {img.author && (
                              <span className="text-[9px] text-white/60 truncate">
                                by {img.author}
                              </span>
                            )}
                            {img.usage_count && img.usage_count > 1 && (
                              <span className="text-[9px] text-white/60">
                                {img.usage_count}x
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {libraryTotal > 24 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button
                        onClick={() => loadLibrary(libraryPage - 1)}
                        disabled={libraryPage <= 1}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        ← Previous
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Page {libraryPage} of {Math.ceil(libraryTotal / 24)}
                      </span>
                      <button
                        onClick={() => loadLibrary(libraryPage + 1)}
                        disabled={libraryPage >= Math.ceil(libraryTotal / 24)}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Library Stats */}
              {libraryTotal > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{libraryTotal}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Images</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {libraryImages.filter(i => i.source_type === 'unsplash').length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Unsplash</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {libraryImages.filter(i => i.source_type === 'dalle').length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">AI Generated</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {libraryImages.filter(i => i.source_type === 'upload').length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Uploaded</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Search Tab (Unsplash) ── */}
          {activeTab === 'search' && (
            <ImageSearch
              onImagesFound={handleImagesFound}
              onLoadingChange={setIsLoading}
              initialQuery={selectedArticle?.category || ''}
            />
          )}

          {/* ── Generate Tab (DALL-E) ── */}
          {activeTab === 'generate' && (
            <AIImageGenerator
              article={selectedArticle}
              onImageGenerated={handleImageGenerated}
            />
          )}
        </div>
      </div>

      {/* Image Grid (for Unsplash / AI results) */}
      {activeTab !== 'library' && (images.length > 0 || isLoading) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Image Gallery
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading
                  ? 'Loading images...'
                  : `${images.length} images available • Click to select`}
              </p>
            </div>

            {hasSelectedImage && (
              <button
                onClick={() => setSelectedImageIds([])}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Clear Selection ({selectedImages.length})
              </button>
            )}
          </div>

          <ImageGrid
            images={images}
            selectedImageIds={selectedImageIds}
            onImageSelect={handleImageSelect}
            onImagePreview={handleImagePreview}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Image Preview Modal */}
      <ImagePreview
        image={previewImage}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onSelect={handlePreviewSelect}
        isSelected={previewImage ? selectedImageIds.includes(previewImage.id) : false}
      />
    </div>
  );
}
