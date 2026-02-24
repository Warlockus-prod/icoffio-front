'use client';

/**
 * IMAGE PICKER MODAL v10.3.0
 *
 * Universal modal for selecting images from multiple sources:
 * - Library: Previously saved images from the database
 * - Unsplash: Search and select stock photos
 * - AI: Generate images with DALL-E 3
 * - Upload: Upload from computer
 *
 * When an image is selected from any source it is automatically saved
 * to the persistent library (telegram_image_library table).
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────

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

interface UnsplashImage {
  id: string;
  url: string;
  thumbnail: string;
  description: string;
  author: string;
  authorUrl?: string;
  width: number;
  height: number;
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string) => void;
  /** Current image URL (if replacing) */
  currentImageUrl?: string;
  /** Article category for context-aware search */
  articleCategory?: string;
  /** Article title for context-aware prompts */
  articleTitle?: string;
}

type Tab = 'library' | 'unsplash' | 'ai' | 'upload';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'unsplash', label: 'Unsplash', icon: '📷' },
  { id: 'ai', label: 'AI Generate', icon: '🤖' },
  { id: 'upload', label: 'Upload', icon: '📤' },
];

// ─── Helper: save to library silently ─────────────────

async function saveToLibrary(params: {
  image_url: string;
  thumbnail_url?: string;
  prompt: string;
  category?: string;
  source_type: string;
  alt_text?: string;
  author?: string;
}) {
  try {
    await fetch('/api/admin/image-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        keywords: params.prompt
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3)
          .slice(0, 15),
      }),
    });
  } catch {
    // silent — saving to library is best-effort
  }
}

// ─── Component ────────────────────────────────────────

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  currentImageUrl,
  articleCategory,
  articleTitle,
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('library');

  // ── Library state ──
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotal, setLibraryTotal] = useState(0);

  // ── Unsplash state ──
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState(articleCategory || 'technology');
  const unsplashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI state ──
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ url: string; prompt: string } | null>(null);
  const [aiError, setAiError] = useState('');

  // ── Upload state ──
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL input state ──
  const [urlInput, setUrlInput] = useState('');

  // ─── Load library images ──────────────────────────────
  const loadLibrary = useCallback(
    async (page = 1, search = '') => {
      setLibraryLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: '20',
          sort: 'recent',
        });
        if (search) params.set('q', search);
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
    },
    []
  );

  // Load library on open
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadLibrary(1, librarySearch);
    }
  }, [isOpen, activeTab]);

  // ─── Unsplash search ──────────────────────────────────
  const searchUnsplash = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setUnsplashLoading(true);
    try {
      const res = await fetch(
        `/api/admin/images?q=${encodeURIComponent(query)}&per_page=20&orientation=landscape`
      );
      const data = await res.json();
      if (data.success) {
        setUnsplashImages(data.images || []);
      }
    } catch {
      // ignore
    } finally {
      setUnsplashLoading(false);
    }
  }, []);

  // Debounced Unsplash search
  useEffect(() => {
    if (activeTab !== 'unsplash' || !unsplashQuery.trim()) return;
    if (unsplashTimerRef.current) clearTimeout(unsplashTimerRef.current);
    unsplashTimerRef.current = setTimeout(() => {
      searchUnsplash(unsplashQuery);
    }, 500);
    return () => {
      if (unsplashTimerRef.current) clearTimeout(unsplashTimerRef.current);
    };
  }, [unsplashQuery, activeTab, searchUnsplash]);

  // Load unsplash when tab opens if no images yet
  useEffect(() => {
    if (isOpen && activeTab === 'unsplash' && unsplashImages.length === 0 && unsplashQuery.trim()) {
      searchUnsplash(unsplashQuery);
    }
  }, [isOpen, activeTab]);

  // ─── AI generation ────────────────────────────────────
  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'dalle',
          title: aiPrompt,
          category: articleCategory,
          size: '1792x1024',
          quality: 'hd',
          style: 'natural',
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        setAiResult({ url: data.url, prompt: data.revisedPrompt || aiPrompt });
      } else {
        setAiError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error');
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiGenerating, articleCategory]);

  // ─── File upload ──────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, WebP, and GIF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }

    // Preview
    setUploadPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        // Save to library and select
        await saveToLibrary({
          image_url: data.url,
          prompt: file.name,
          source_type: 'upload',
          alt_text: file.name,
        });
        onSelect(data.url, file.name);
        onClose();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onSelect, onClose]);

  // ─── Select handlers ──────────────────────────────────

  const handleLibrarySelect = useCallback(
    (img: LibraryImage) => {
      // Increment usage
      fetch('/api/admin/image-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: img.image_url }),
      }).catch(() => {});
      onSelect(img.image_url, img.alt_text || img.prompt);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleUnsplashSelect = useCallback(
    (img: UnsplashImage) => {
      // Save to library
      saveToLibrary({
        image_url: img.url,
        thumbnail_url: img.thumbnail,
        prompt: img.description || unsplashQuery,
        category: articleCategory,
        source_type: 'unsplash',
        alt_text: img.description,
        author: img.author,
      });
      onSelect(img.url, img.description);
      onClose();
    },
    [onSelect, onClose, unsplashQuery, articleCategory]
  );

  const handleAiSelect = useCallback(() => {
    if (!aiResult) return;
    // Save to library
    saveToLibrary({
      image_url: aiResult.url,
      prompt: aiResult.prompt,
      category: articleCategory,
      source_type: 'dalle',
      alt_text: aiResult.prompt,
    });
    onSelect(aiResult.url, aiResult.prompt);
    onClose();
  }, [aiResult, onSelect, onClose, articleCategory]);

  const handleUrlSelect = useCallback(() => {
    if (!urlInput.trim()) return;
    // Save to library
    saveToLibrary({
      image_url: urlInput.trim(),
      prompt: articleTitle || 'Manual URL',
      source_type: 'manual',
      alt_text: articleTitle,
    });
    onSelect(urlInput.trim());
    onClose();
  }, [urlInput, onSelect, onClose, articleTitle]);

  // ─── Close on Escape ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'library' && libraryTotal > 0 && (
                <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">
                  {libraryTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* ── Library Tab ── */}
          {activeTab === 'library' && (
            <div>
              {/* Search */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLibrary(1, librarySearch)}
                  placeholder="Search saved images..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={() => loadLibrary(1, librarySearch)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Search
                </button>
              </div>

              {libraryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="font-medium">No saved images yet</p>
                  <p className="text-sm mt-1">Images you select or generate will appear here</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {libraryImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => handleLibrarySelect(img)}
                        className="group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                      >
                        <img
                          src={img.thumbnail_url || img.image_url}
                          alt={img.alt_text || img.prompt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23ddd" width="100" height="60"/><text x="50" y="35" text-anchor="middle" fill="%23999" font-size="10">Error</text></svg>';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                          <div className="w-full p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-white text-xs truncate">
                              {img.alt_text || img.prompt}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {img.source_type && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white uppercase">
                                  {img.source_type}
                                </span>
                              )}
                              {img.usage_count && img.usage_count > 1 && (
                                <span className="text-[10px] text-white/70">
                                  used {img.usage_count}x
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {libraryTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => loadLibrary(libraryPage - 1, librarySearch)}
                        disabled={libraryPage <= 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Page {libraryPage} of {Math.ceil(libraryTotal / 20)}
                      </span>
                      <button
                        onClick={() => loadLibrary(libraryPage + 1, librarySearch)}
                        disabled={libraryPage >= Math.ceil(libraryTotal / 20)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Unsplash Tab ── */}
          {activeTab === 'unsplash' && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  value={unsplashQuery}
                  onChange={(e) => setUnsplashQuery(e.target.value)}
                  placeholder="Search Unsplash photos..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Quick search chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['technology', 'artificial intelligence', 'apple products', 'business', 'nature', 'abstract'].map(
                  (q) => (
                    <button
                      key={q}
                      onClick={() => setUnsplashQuery(q)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        unsplashQuery === q
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {q}
                    </button>
                  )
                )}
              </div>

              {unsplashLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : unsplashImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No results. Try a different search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {unsplashImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleUnsplashSelect(img)}
                      className="group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                    >
                      <img
                        src={img.thumbnail}
                        alt={img.description}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                        <div className="w-full p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-white text-xs truncate">{img.description}</div>
                          <div className="text-white/70 text-[10px]">by {img.author}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── AI Generate Tab ── */}
          {activeTab === 'ai' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Describe the image you want
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Modern technology concept with artificial intelligence, clean minimalist style"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  disabled={aiGenerating}
                />
              </div>

              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  'Modern technology concept, clean design',
                  'Artificial intelligence visualization, futuristic',
                  'Professional business innovation theme',
                  'Abstract digital background, geometric shapes',
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAiPrompt(p)}
                    disabled={aiGenerating}
                    className="px-3 py-1 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                  >
                    {p.length > 40 ? p.substring(0, 40) + '...' : p}
                  </button>
                ))}
                {articleTitle && (
                  <button
                    onClick={() =>
                      setAiPrompt(
                        `Professional editorial image for article about "${articleTitle}", modern clean style`
                      )
                    }
                    disabled={aiGenerating}
                    className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-full transition-colors text-blue-600 dark:text-blue-400"
                  >
                    From article title
                  </button>
                )}
              </div>

              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating (10-30 sec)...
                  </>
                ) : (
                  <>
                    <span>🎨</span> Generate with DALL-E 3
                  </>
                )}
              </button>

              {aiError && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="mt-4">
                  <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <img
                      src={aiResult.url}
                      alt={aiResult.prompt}
                      className="w-full h-auto max-h-80 object-contain bg-gray-100 dark:bg-gray-900"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {aiResult.prompt}
                  </p>
                  <button
                    onClick={handleAiSelect}
                    className="mt-3 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Use This Image
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Upload Tab ── */}
          {activeTab === 'upload' && (
            <div>
              {/* File upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <div className="text-4xl mb-3">📁</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Click to upload an image
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  JPEG, PNG, WebP, GIF (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {uploading && uploadPreview && (
                <div className="mt-4 flex items-center gap-3">
                  <img
                    src={uploadPreview}
                    alt="Uploading"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    Uploading...
                  </div>
                </div>
              )}

              {/* OR divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">or paste URL</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSelect()}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={handleUrlSelect}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Use URL
                </button>
              </div>

              {/* URL preview */}
              {urlInput.trim() && (
                <div className="mt-3">
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-600"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with current image */}
        {currentImageUrl && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-3">
            <img
              src={currentImageUrl}
              alt="Current"
              className="w-10 h-10 object-cover rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Current image — select a new one above to replace
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
