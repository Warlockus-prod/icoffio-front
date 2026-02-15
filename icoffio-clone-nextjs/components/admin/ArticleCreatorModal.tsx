'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import toast from 'react-hot-toast';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';
import { renderContent } from '@/lib/markdown';
import { normalizeAiGeneratedText } from '@/lib/utils/content-formatter';
import type { AdPlacementConfig } from '@/lib/config/adPlacements';
import { getAdPlacements } from '@/lib/config/adPlacementsManager';
import { VIDEO_PLAYERS, type VideoPlayerConfig } from '@/lib/config/video-players';
import {
  extractMonetizationSettingsFromContent,
  normalizeMonetizationSettings,
  type ArticleMonetizationSettings
} from '@/lib/monetization-settings';

// ========== TYPES ==========

type Stage = 'editing' | 'images' | 'monetization' | 'preview';

interface ImageOption {
  id: string;
  url: string;
  thumbnail?: string;
  source: 'unsplash' | 'ai' | 'custom';
  query?: string;
  prompt?: string;
  author?: string;
}

interface ArticleCreatorModalProps {
  article: Article;
  onClose: () => void;
  onPublish?: (article: Article) => void;
}

// ========== CONSTANTS ==========

const CATEGORIES = [
  { id: 'ai', label: 'AI & ML', icon: '🤖', color: 'blue' },
  { id: 'apple', label: 'Apple', icon: '🍎', color: 'gray' },
  { id: 'tech', label: 'Technology', icon: '⚙️', color: 'green' },
  { id: 'news', label: 'News', icon: '📰', color: 'red' },
  { id: 'games', label: 'Games', icon: '🎮', color: 'purple' },
  { id: 'digital', label: 'Digital', icon: '📱', color: 'indigo' }
];

// ✅ v8.4.0: Content Styles for regeneration
const CONTENT_STYLES = [
  { id: 'journalistic', label: 'Journalistic', icon: '📰' },
  { id: 'seo-optimized', label: 'SEO Optimized', icon: '🔍' },
  { id: 'academic', label: 'Academic', icon: '🎓' },
  { id: 'casual', label: 'Casual', icon: '💬' },
  { id: 'technical', label: 'Technical', icon: '⚙️' }
];

const DEFAULT_PLACEHOLDER_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';
const STAGE_ORDER: Stage[] = ['editing', 'images', 'monetization', 'preview'];
const AD_POSITION_ORDER: AdPlacementConfig['position'][] = [
  'header',
  'content-top',
  'content-middle',
  'content-bottom',
  'sidebar-top',
  'sidebar-bottom',
  'footer'
];
const AD_POSITION_META: Record<
  AdPlacementConfig['position'],
  { label: string; icon: string; description: string }
> = {
  header: {
    label: 'Header',
    icon: '🧭',
    description: 'Top header area before article content'
  },
  'content-top': {
    label: 'Content Top',
    icon: '⬆️',
    description: 'After title / first section'
  },
  'content-middle': {
    label: 'Content Middle',
    icon: '↕️',
    description: 'In the middle of article content'
  },
  'content-bottom': {
    label: 'Content Bottom',
    icon: '⬇️',
    description: 'After main article content'
  },
  'sidebar-top': {
    label: 'Sidebar Top',
    icon: '📌',
    description: 'Top sidebar block (desktop)'
  },
  'sidebar-bottom': {
    label: 'Sidebar Bottom',
    icon: '📍',
    description: 'Bottom sidebar block (desktop)'
  },
  footer: {
    label: 'Footer',
    icon: '🧱',
    description: 'Before related articles / footer area'
  }
};

const isPlaceholderImage = (url?: string): boolean =>
  Boolean(url && url.includes(DEFAULT_PLACEHOLDER_IMAGE_MARKER));

// ========== MAIN COMPONENT ==========

export default function ArticleCreatorModal({ article, onClose, onPublish }: ArticleCreatorModalProps) {
  const parsedEnContent = useMemo(
    () => extractMonetizationSettingsFromContent(article.content || ''),
    [article.content]
  );
  const parsedPlContent = useMemo(
    () => extractMonetizationSettingsFromContent(article.translations?.pl?.content || ''),
    [article.translations?.pl?.content]
  );
  const initialMonetizationFromContent = useMemo(
    () => parsedEnContent.settings || parsedPlContent.settings || article.monetizationSettings || null,
    [parsedEnContent.settings, parsedPlContent.settings, article.monetizationSettings]
  );

  // ===== STATE =====
  const [stage, setStage] = useState<Stage>('editing');
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishMinimized, setIsPublishMinimized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Editable fields - ENGLISH
  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt || '');
  const [content, setContent] = useState(() =>
    normalizeAiGeneratedText(parsedEnContent.cleanContent || article.content || '')
  );
  const [category, setCategory] = useState(article.category);
  const [imageUrl, setImageUrl] = useState(article.image || article.images?.[0] || '');
  
  // ✅ v8.2.0: Editable fields - POLISH
  const [plTitle, setPlTitle] = useState(article.translations?.pl?.title || '');
  const [plExcerpt, setPlExcerpt] = useState(article.translations?.pl?.excerpt || '');
  const [plContent, setPlContent] = useState(() =>
    normalizeAiGeneratedText(parsedPlContent.cleanContent || article.translations?.pl?.content || '')
  );

  // Per-article monetization overrides
  const [availableAdPlacements, setAvailableAdPlacements] = useState<AdPlacementConfig[]>([]);
  const [availableVideoPlayers] = useState<VideoPlayerConfig[]>(VIDEO_PLAYERS);
  const [selectedAdPlacementIds, setSelectedAdPlacementIds] = useState<string[]>([]);
  const [selectedVideoPlayerIds, setSelectedVideoPlayerIds] = useState<string[]>([]);
  
  // ✅ v8.2.0: Multiple images (up to 5)
  const [selectedImages, setSelectedImages] = useState<string[]>(() => {
    const combined = [article.image, ...(article.images || [])].filter((img): img is string => Boolean(img));
    return Array.from(new Set(combined)).slice(0, 5);
  });
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  
  // Image selection state
  const [imageSearch, setImageSearch] = useState('');
  const [imageOptions, setImageOptions] = useState<ImageOption[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // ✅ v8.4.0: Style regeneration
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Store
  const { removeJobFromQueue, addActivity, updateArticle } = useAdminStore();
  
  // ===== TIPTAP EDITOR =====
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your article content...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setHasUnsavedChanges(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // ===== EFFECTS =====
  useEffect(() => {
    // Auto-generate image search query from title
    if (title && !imageSearch) {
      setImageSearch(title.split(' ').slice(0, 5).join(' '));
    }
  }, [title]);

  useEffect(() => {
    if (!isPublishing) {
      setIsPublishMinimized(false);
    }
  }, [isPublishing]);

  useEffect(() => {
    const articlePlacements = getAdPlacements().filter((ad) => ad.location === 'article');
    setAvailableAdPlacements(articlePlacements);

    const defaultAdPlacementIds = articlePlacements
      .filter((ad) => ad.enabled)
      .map((ad) => ad.id);
    const defaultVideoPlayerIds = VIDEO_PLAYERS
      .filter((player) => player.enabled)
      .map((player) => player.id);

    const initialSettings = normalizeMonetizationSettings(initialMonetizationFromContent);
    const hasCustomSettings = Boolean(initialMonetizationFromContent);

    setSelectedAdPlacementIds(
      hasCustomSettings ? initialSettings.enabledAdPlacementIds : defaultAdPlacementIds
    );
    setSelectedVideoPlayerIds(
      hasCustomSettings ? initialSettings.enabledVideoPlayerIds : defaultVideoPlayerIds
    );
  }, [initialMonetizationFromContent]);

  const updateSelectedImages = useCallback((updater: (prev: string[]) => string[]) => {
    setSelectedImages(prev => {
      const next = updater(prev);
      setImageUrl(next[0] || '');
      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  const resolveImageSelection = useCallback(() => {
    const candidates = [
      ...selectedImages,
      imageUrl,
      article.image,
      ...(article.images || [])
    ].filter((img): img is string => Boolean(img && img.trim()));

    const uniqueImages = Array.from(new Set(candidates));
    if (uniqueImages.length === 0) {
      return { heroImage: '', contentImages: [] as string[] };
    }

    const preferredHeroImage = uniqueImages.find((img) => !isPlaceholderImage(img)) || uniqueImages[0];
    const ordered = [preferredHeroImage, ...uniqueImages.filter((img) => img !== preferredHeroImage)].slice(0, 5);

    return {
      heroImage: ordered[0] || '',
      contentImages: ordered.slice(1)
    };
  }, [selectedImages, imageUrl, article.image, article.images]);

  const toggleAdPlacement = useCallback((placementId: string) => {
    setSelectedAdPlacementIds((prev) =>
      prev.includes(placementId) ? prev.filter((id) => id !== placementId) : [...prev, placementId]
    );
    setHasUnsavedChanges(true);
  }, []);

  const toggleVideoPlayer = useCallback((playerId: string) => {
    setSelectedVideoPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
    setHasUnsavedChanges(true);
  }, []);

  const buildMonetizationSettings = useCallback((): ArticleMonetizationSettings => {
    return normalizeMonetizationSettings({
      enabledAdPlacementIds: selectedAdPlacementIds,
      enabledVideoPlayerIds: selectedVideoPlayerIds
    });
  }, [selectedAdPlacementIds, selectedVideoPlayerIds]);

  const selectedAdPlacements = useMemo(
    () => availableAdPlacements.filter((ad) => selectedAdPlacementIds.includes(ad.id)),
    [availableAdPlacements, selectedAdPlacementIds]
  );

  const adPlacementsByPosition = useMemo(() => {
    return AD_POSITION_ORDER.map((position) => ({
      position,
      items: selectedAdPlacements.filter((ad) => ad.position === position)
    }));
  }, [selectedAdPlacements]);

  const moveSelectedImage = useCallback((fromIndex: number, toIndex: number) => {
    updateSelectedImages(prev => {
      if (fromIndex === toIndex || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [updateSelectedImages]);

  const removeSelectedImageAt = useCallback((index: number) => {
    updateSelectedImages(prev => prev.filter((_, i) => i !== index));
    toast.success('🗑️ Image removed');
  }, [updateSelectedImages]);

  // ===== HANDLERS =====
  
  const handleSave = useCallback(() => {
    setIsSaving(true);
    const normalizedEnContent = normalizeAiGeneratedText(content);
    const normalizedPlContent = normalizeAiGeneratedText(plContent);
    const { heroImage, contentImages } = resolveImageSelection();
    const monetizationSettings = buildMonetizationSettings();
    
    // ✅ v8.2.0: Save both languages + multiple images
    updateArticle({
      id: article.id,
      title,
      excerpt,
      content: normalizedEnContent,
      category,
      image: heroImage,
      images: contentImages,
      monetizationSettings,
      translations: {
        en: { title, content: normalizedEnContent, excerpt },
        pl: { title: plTitle, content: normalizedPlContent, excerpt: plExcerpt }
      }
    });
    
    toast.success('✅ EN + PL saved!');
    setHasUnsavedChanges(false);
    setIsSaving(false);
  }, [article.id, title, excerpt, content, category, plTitle, plContent, plExcerpt, updateArticle, resolveImageSelection, buildMonetizationSettings]);

  const handleSearchImages = async () => {
    if (!imageSearch.trim()) return;
    
    setIsLoadingImages(true);
    try {
      const response = await fetch(`/api/admin/images?q=${encodeURIComponent(imageSearch)}&per_page=9`);
      const result = await response.json();
      
      if (result.success && result.images) {
        setImageOptions(result.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          thumbnail: img.thumbnail || img.url,
          source: 'unsplash' as const,
          query: imageSearch,
          author: img.author
        })));
      }
    } catch (error) {
      toast.error('Failed to search images');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleGenerateAIImage = async () => {
    const promptToUse = aiPrompt.trim() || `Professional blog header image for article about: ${title}`;
    
    if (!aiPrompt.trim()) {
      setAiPrompt(promptToUse);
    }
    
    setIsGeneratingAI(true);
    const toastId = toast.loading('🎨 Generating AI image...');
    
    try {
      const response = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: 'dalle',
          title: title,
          excerpt: excerpt,
          category: category
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.url) {
        const newOption: ImageOption = {
          id: `ai-${Date.now()}`,
          url: result.url,
          thumbnail: result.url,
          source: 'ai',
          prompt: result.revisedPrompt || promptToUse
        };
        setImageOptions(prev => [newOption, ...prev]);
        updateSelectedImages(prev => {
          const withoutNew = prev.filter(url => url !== result.url);
          const withoutLeadingPlaceholder =
            withoutNew.length > 0 && isPlaceholderImage(withoutNew[0])
              ? withoutNew.slice(1)
              : withoutNew;
          return [result.url, ...withoutLeadingPlaceholder].slice(0, 5);
        });
        toast.success('🎨 AI image generated and set as hero!', { id: toastId });
      } else {
        toast.error(result.error || 'Failed to generate AI image', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to generate AI image', { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddCustomImage = () => {
    const customUrl = customImageUrl.trim();
    if (!customUrl) return;

    setImageOptions(prev => {
      const next: ImageOption = {
        id: `custom-${Date.now()}`,
        url: customUrl,
        thumbnail: customUrl,
        source: 'custom'
      };
      return [next, ...prev.filter(option => option.url !== customUrl)];
    });

    updateSelectedImages(prev => {
      const withoutCustom = prev.filter(url => url !== customUrl);
      const withoutLeadingPlaceholder =
        withoutCustom.length > 0 && isPlaceholderImage(withoutCustom[0])
          ? withoutCustom.slice(1)
          : withoutCustom;
      return [customUrl, ...withoutLeadingPlaceholder].slice(0, 5);
    });
    setCustomImageUrl('');
    toast.success('✅ Custom image added as hero!');
  };

  const handleRemoveImage = () => {
    updateSelectedImages(() => []);
    toast.success('🗑️ Image removed');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      removeJobFromQueue(article.id);
      addActivity({
        type: 'parsing_failed',
        message: `Article deleted: ${title.substring(0, 50)}...`
      });
      toast.success('🗑️ Article deleted');
      onClose();
    }
  };

  // ✅ v8.4.0: Regenerate content with new style
  const handleRegenerateStyle = async (styleId: string) => {
    setIsRegenerating(true);
    setShowStylePicker(false);
    
    const toastId = toast.loading(`🔄 Regenerating with ${styleId} style...`);
    
    try {
      const response = await fetch('/api/admin/test-content-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          style: styleId,
          title: title
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.processedText) {
        // Update English content
        const normalizedEn = normalizeAiGeneratedText(result.processedText);
        setContent(normalizedEn);
        if (editor) {
          editor.commands.setContent(normalizedEn);
        }
        
        // Also regenerate Polish if exists
        if (plContent) {
          const plResponse = await fetch('/api/admin/test-content-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: plContent,
              style: styleId,
              title: plTitle
            })
          });
          
          const plResult = await plResponse.json();
          if (plResult.success && plResult.processedText) {
            setPlContent(normalizeAiGeneratedText(plResult.processedText));
          }
        }
        
        setHasUnsavedChanges(true);
        toast.success(`✅ Content regenerated with ${styleId} style!`, { id: toastId });
      } else {
        toast.error(result.error || 'Failed to regenerate', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to regenerate content', { id: toastId });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePublish = async () => {
    // Validate required fields
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }
    
    const normalizedEnContent = normalizeAiGeneratedText(content);
    const normalizedPlContent = normalizeAiGeneratedText(plContent);
    const { heroImage, contentImages } = resolveImageSelection();
    const monetizationSettings = buildMonetizationSettings();

    setIsPublishing(true);
    const toastId = toast.loading('📤 Adding to publishing queue...');
    
    try {
      // ✅ v8.2.0: Publish with both languages + multiple images
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish-article',
          articleId: article.id,
          article: {
            ...article,
            title,
            excerpt,
            content: normalizedEnContent,
            category,
            image: heroImage,
            images: contentImages,
            monetizationSettings,
            translations: {
              en: { title, content: normalizedEnContent, excerpt },
              pl: { title: plTitle, content: normalizedPlContent, excerpt: plExcerpt }
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        removeJobFromQueue(article.id);
        addActivity({
          type: 'article_published',
          message: `Added to publishing queue: ${title}`,
          url: result.urls?.en || `/en/article/${article.id}`
        });
        toast.success(`✅ "${title.substring(0, 40)}..." added to queue!`, { id: toastId });
        onPublish?.({
          ...article,
          title,
          excerpt,
          content: normalizedEnContent,
          category,
          image: heroImage,
          images: contentImages,
          monetizationSettings
        });
        onClose();
      } else {
        throw new Error(result.error || 'Publication failed');
      }
    } catch (error) {
      toast.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (isPublishing) {
      setIsPublishMinimized(true);
      return;
    }

    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Get content for preview
  const getPreviewContent = () => {
    if (language === 'en') {
      return { title, excerpt, content };
    } else {
      return {
        title: plTitle || article.translations?.pl?.title || title,
        excerpt: plExcerpt || article.translations?.pl?.excerpt || excerpt,
        content: plContent || article.translations?.pl?.content || content
      };
    }
  };

  const previewContent = getPreviewContent();
  const { heroImage: previewHeroImage } = resolveImageSelection();
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const currentStageIndex = STAGE_ORDER.indexOf(stage);
  const nextStage = STAGE_ORDER[Math.min(currentStageIndex + 1, STAGE_ORDER.length - 1)];

  if (isPublishMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-green-500">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="animate-spin w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Publishing to queue...
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {title}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsPublishMinimized(false)}
            className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            ⬆️ Expand
          </button>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        
        {/* ===== HEADER ===== */}
        <div className="flex-shrink-0 p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg">
                ✨
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Article Creator
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hasUnsavedChanges && <span className="text-orange-500">● </span>}
                  {wordCount} words • {category}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Stage Navigation */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'editing', label: '✏️ Edit', icon: '1' },
              { id: 'images', label: '🖼️ Images', icon: '2' },
              { id: 'monetization', label: '💰 Monetization', icon: '3' },
              { id: 'preview', label: '👁️ Preview', icon: '4' }
            ].map((s, index) => (
              <button
                key={s.id}
                onClick={() => setStage(s.id as Stage)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                  stage === s.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                    : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
          
          {/* STAGE 1: EDITING - LANGUAGE TABS (like Preview) */}
          {stage === 'editing' && (
            <div className="p-6 space-y-6">
              {/* Language Tabs - Same style as Preview */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    language === 'en'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  🇺🇸 English
                  {title && <span className="text-xs opacity-75">✓</span>}
                </button>
                <button
                  onClick={() => setLanguage('pl')}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    language === 'pl'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  🇵🇱 Polski
                  {plTitle && <span className="text-xs opacity-75">✓</span>}
                </button>
                
                {/* ✅ v8.4.0: Style Regeneration */}
                <div className="flex-1" />
                <div className="relative">
                  <button
                    onClick={() => setShowStylePicker(!showStylePicker)}
                    disabled={isRegenerating}
                    className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate Style'}
                  </button>
                  
                  {/* Style Picker Dropdown */}
                  {showStylePicker && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
                          Select new style
                        </span>
                      </div>
                      {CONTENT_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => handleRegenerateStyle(style.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                        >
                          <span className="text-xl">{style.icon}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📝 {language === 'en' ? 'Title' : 'Tytuł'}
                </label>
                <input
                  type="text"
                  value={language === 'en' ? title : plTitle}
                  onChange={(e) => {
                    if (language === 'en') setTitle(e.target.value);
                    else setPlTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-4 py-3 text-xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder={language === 'en' ? 'Enter article title...' : 'Wpisz tytuł artykułu...'}
                />
              </div>

              {/* Category (only for English) */}
              {language === 'en' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📁 Category
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setCategory(cat.id); setHasUnsavedChanges(true); }}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          category === cat.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <div className="text-xs mt-1 font-medium">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📄 {language === 'en' ? 'Excerpt' : 'Opis'} 
                  <span className={`font-normal ml-2 ${(language === 'en' ? excerpt : plExcerpt).length > 150 ? 'text-orange-500' : 'text-gray-500'}`}>
                    ({(language === 'en' ? excerpt : plExcerpt).length}/160)
                  </span>
                </label>
                <textarea
                  value={language === 'en' ? excerpt : plExcerpt}
                  onChange={(e) => {
                    const val = e.target.value.substring(0, 160);
                    if (language === 'en') setExcerpt(val);
                    else setPlExcerpt(val);
                    setHasUnsavedChanges(true);
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  placeholder={language === 'en' ? 'Short description for SEO and previews...' : 'Krótki opis do SEO i podglądów...'}
                />
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ✍️ {language === 'en' ? 'Content' : 'Treść'}
                </label>
                
                {/* Editor Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-t-xl border-2 border-b-0 border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 rounded-lg ${editor?.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded-lg ${editor?.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded-lg ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    H2
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 rounded-lg ${editor?.isActive('heading', { level: 3 }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    H3
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded-lg ${editor?.isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    • List
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded-lg ${editor?.isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    1. List
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={`p-2 rounded-lg ${editor?.isActive('blockquote') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    " Quote
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={!editor?.can().undo()}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    ↩️
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={!editor?.can().redo()}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    ↪️
                  </button>
                </div>
                
                {/* WYSIWYG Editor for current language */}
                {language === 'en' ? (
                  <div className="border-2 border-gray-200 dark:border-gray-700 rounded-b-xl bg-white dark:bg-gray-800">
                    <EditorContent editor={editor} />
                  </div>
                ) : (
                  <textarea
                    value={plContent}
                    onChange={(e) => { setPlContent(e.target.value); setHasUnsavedChanges(true); }}
                    rows={15}
                    className="w-full px-4 py-3 border-2 border-t-0 border-gray-200 dark:border-gray-700 rounded-b-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y min-h-[400px] font-mono text-sm"
                    placeholder="Wpisz treść artykułu po polsku..."
                  />
                )}
                
                {/* Word count */}
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {language === 'en' 
                    ? `${content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} words`
                    : `${plContent.split(/\s+/).filter(Boolean).length} słów`
                  }
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: IMAGES - MULTIPLE SELECTION + UPLOAD */}
          {stage === 'images' && (
            <div className="p-6 space-y-6">
              {/* Selected Images Preview */}
              {selectedImages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    ✅ Selected Images ({selectedImages.length}/5)
                    <span className="text-xs font-normal text-gray-500">
                      #1 = Hero, #2-5 = In content
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Drag cards to reorder or use arrows. First image is used as article hero.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {selectedImages.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        draggable
                        onDragStart={() => setDraggedImageIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedImageIndex === null) return;
                          moveSelectedImage(draggedImageIndex, index);
                          setDraggedImageIndex(null);
                        }}
                        onDragEnd={() => setDraggedImageIndex(null)}
                        className={`relative rounded-xl overflow-hidden border-2 border-green-500 group cursor-move ${
                          draggedImageIndex === index ? 'opacity-70 ring-2 ring-blue-500/40' : ''
                        }`}
                      >
                        <img src={url} alt={`Selected ${index + 1}`} className="w-full h-24 object-cover" />
                        <div className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                          {index + 1}
                        </div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-1">
                          <button
                            onClick={() => moveSelectedImage(index, index - 1)}
                            disabled={index === 0}
                            className="w-6 h-6 bg-black/55 hover:bg-black/70 disabled:opacity-30 text-white rounded text-xs transition-colors"
                            title="Move left"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => moveSelectedImage(index, index + 1)}
                            disabled={index === selectedImages.length - 1}
                            className="w-6 h-6 bg-black/55 hover:bg-black/70 disabled:opacity-30 text-white rounded text-xs transition-colors"
                            title="Move right"
                          >
                            →
                          </button>
                        </div>
                        <button
                          onClick={() => removeSelectedImageAt(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-white text-[10px] text-center py-0.5 font-medium">
                            HERO
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload from Computer */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  📤 Upload from Computer
                </h3>
                <div
                  className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-100'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100'); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                    const files = e.dataTransfer.files;
                    for (const file of Array.from(files)) {
                      if (selectedImages.length >= 5) { toast.error('Max 5 images!'); break; }
                      if (!file.type.startsWith('image/')) continue;
                      const toastId = toast.loading(`📤 Uploading ${file.name}...`);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (result.success) {
                          updateSelectedImages(prev => {
                            if (prev.length >= 5) return prev;
                            return [...prev, result.url];
                          });
                          toast.success(`✅ Uploaded to CDN!`, { id: toastId });
                        } else {
                          toast.error(result.error || 'Upload failed', { id: toastId });
                        }
                      } catch { toast.error('Upload failed', { id: toastId }); }
                    }
                  }}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files) return;
                      for (const file of Array.from(files)) {
                        if (selectedImages.length >= 5) { toast.error('Max 5 images!'); break; }
                        const toastId = toast.loading(`📤 Uploading ${file.name}...`);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                          const result = await res.json();
                          if (result.success) {
                            updateSelectedImages(prev => {
                              if (prev.length >= 5) return prev;
                              return [...prev, result.url];
                            });
                            toast.success(`✅ Uploaded to CDN!`, { id: toastId });
                          } else {
                            toast.error(result.error || 'Upload failed', { id: toastId });
                          }
                        } catch { toast.error('Upload failed', { id: toastId }); }
                      }
                    }}
                  />
                  <div className="text-4xl mb-2">📤</div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, GIF (max 10MB) • Auto-optimized for web</p>
                </div>
              </div>

              {/* Search Unsplash */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Search Unsplash</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchImages()}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Search for images..."
                  />
                  <button onClick={handleSearchImages} disabled={isLoadingImages} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                    {isLoadingImages ? '⏳' : '🔍'} Search
                  </button>
                </div>
              </div>

              {/* AI Generation */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🤖 Generate with AI</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 px-4 py-2 border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Describe the image you want..."
                  />
                  <button onClick={handleGenerateAIImage} disabled={isGeneratingAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                    {isGeneratingAI ? '⏳ Generating...' : '🎨 Generate'}
                  </button>
                </div>
              </div>

              {/* Image Grid - Multi-select */}
              {imageOptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    📷 Available Images - Click to add ({imageOptions.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {imageOptions.map((option) => {
                      const isSelected = selectedImages.includes(option.url);
                      const selectionIndex = selectedImages.indexOf(option.url);
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            if (isSelected) {
                              updateSelectedImages(prev => prev.filter(u => u !== option.url));
                            } else {
                              updateSelectedImages(prev => {
                                const withoutCurrent = prev.filter(u => u !== option.url);
                                const withoutLeadingPlaceholder =
                                  withoutCurrent.length > 0 && isPlaceholderImage(withoutCurrent[0])
                                    ? withoutCurrent.slice(1)
                                    : withoutCurrent;
                                return [option.url, ...withoutLeadingPlaceholder].slice(0, 5);
                              });
                            }
                          }}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                            isSelected ? 'border-green-500 ring-2 ring-green-500/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                          }`}
                        >
                          <img src={option.thumbnail || option.url} alt="Image option" className="w-full h-28 object-cover" />
                          {isSelected && (
                            <div className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${selectionIndex === 0 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                              {selectionIndex + 1}
                            </div>
                          )}
                          <div className="absolute top-1 right-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              option.source === 'unsplash' ? 'bg-blue-500 text-white' : option.source === 'ai' ? 'bg-purple-500 text-white' : 'bg-green-500 text-white'
                            }`}>
                              {option.source === 'unsplash' ? '📷' : option.source === 'ai' ? '🤖' : '🔗'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skip */}
              <div className="text-center py-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setStage('monetization')} className="text-gray-500 hover:text-gray-700 underline">
                  ⏭️ Skip and continue to monetization
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: MONETIZATION */}
          {stage === 'monetization' && (
            <div className="p-6 space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  💰 Article Monetization Settings
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  По умолчанию выбраны все активные placements из Advertising Manager. Для этой статьи можно оставить больше или меньше.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedAdPlacementIds(availableAdPlacements.map((ad) => ad.id));
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Select all ad slots
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAdPlacementIds([]);
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                  >
                    Disable all ad slots
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVideoPlayerIds(availableVideoPlayers.map((player) => player.id));
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
                  >
                    Enable all video players
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVideoPlayerIds([]);
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                  >
                    Disable all video players
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🖥️ Display Formats</h4>
                  <div className="space-y-2">
                    {availableAdPlacements
                      .filter((ad) => ad.device === 'desktop' || ad.device === 'both')
                      .map((ad) => {
                        const checked = selectedAdPlacementIds.includes(ad.id);
                        return (
                          <label
                            key={ad.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer ${
                              checked
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {ad.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ad.format} • {ad.position} • {ad.enabled ? 'default ON' : 'default OFF'}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAdPlacement(ad.id)}
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">📱 Mobile Formats</h4>
                  <div className="space-y-2">
                    {availableAdPlacements
                      .filter((ad) => ad.device === 'mobile' || ad.device === 'both')
                      .map((ad) => {
                        const checked = selectedAdPlacementIds.includes(ad.id);
                        return (
                          <label
                            key={ad.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer ${
                              checked
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {ad.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ad.format} • {ad.position} • {ad.enabled ? 'default ON' : 'default OFF'}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAdPlacement(ad.id)}
                              className="h-4 w-4"
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🎬 Video Players (On/Off)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableVideoPlayers.map((player) => {
                    const checked = selectedVideoPlayerIds.includes(player.id);
                    return (
                      <label
                        key={player.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer ${
                          checked
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.type} • {player.position} • {player.enabled ? 'default ON' : 'default OFF'}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVideoPlayer(player.id)}
                          className="h-4 w-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: PREVIEW */}
          {stage === 'preview' && (
            <div className="p-6">
              {/* Language Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    language === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  🇺🇸 English
                </button>
                <button
                  onClick={() => setLanguage('pl')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    language === 'pl'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  🇵🇱 Polski
                </button>
              </div>

              {/* Article Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Image */}
                {previewHeroImage && (
                  <img
                    src={previewHeroImage}
                    alt={previewContent.title}
                    className="w-full h-80 object-cover"
                  />
                )}
                
                {/* Content */}
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {CATEGORIES.find(c => c.id === category)?.icon} {CATEGORIES.find(c => c.id === category)?.label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Ads: {selectedAdPlacementIds.length}
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      Video Players: {selectedVideoPlayerIds.length}
                    </span>
                  </div>

                  {/* Visual monetization map */}
                  <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      🗺️ Ad Slots Layout Preview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {adPlacementsByPosition.map(({ position, items }) => (
                        <div
                          key={position}
                          className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-white/70 dark:bg-gray-800/40 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {AD_POSITION_META[position].icon} {AD_POSITION_META[position].label}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                              {items.length}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mb-2">
                            {AD_POSITION_META[position].description}
                          </div>
                          {items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((ad) => (
                                <span
                                  key={ad.id}
                                  className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                >
                                  {ad.format} • {ad.device}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-400">No slots selected</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {previewContent.title}
                  </h1>
                  
                  {previewContent.excerpt && (
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 italic border-l-4 border-blue-500 pl-4">
                      {previewContent.excerpt}
                    </p>
                  )}
                  
                  <div 
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(previewContent.content || '') }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex-shrink-0 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
              >
                🗑️ Delete
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? '⏳ Saving...' : '💾 Save Draft'}
                </button>
              )}
              
              {stage !== 'preview' ? (
                <button
                  onClick={() => setStage(nextStage)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                  Next →
                </button>
              ) : (
                <>
                  {isPublishing && (
                    <button
                      onClick={() => setIsPublishMinimized(true)}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                    >
                      ⬇️ Minimize
                    </button>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                  >
                    {isPublishing ? '⏳ Adding...' : '🚀 Add to Queue'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
