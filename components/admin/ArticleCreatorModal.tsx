'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import toast from 'react-hot-toast';
import { useAdminStore, type Article } from '@/lib/stores/admin-store';

// ========== TYPES ==========

type Stage = 'editing' | 'images' | 'preview';

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

// ========== MAIN COMPONENT ==========

export default function ArticleCreatorModal({ article, onClose, onPublish }: ArticleCreatorModalProps) {
  // ===== STATE =====
  const [stage, setStage] = useState<Stage>('editing');
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Editable fields - ENGLISH
  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt || '');
  const [content, setContent] = useState(article.content);
  const [category, setCategory] = useState(article.category);
  const [imageUrl, setImageUrl] = useState(article.image || '');
  
  // ✅ v8.2.0: Editable fields - POLISH
  const [plTitle, setPlTitle] = useState(article.translations?.pl?.title || '');
  const [plExcerpt, setPlExcerpt] = useState(article.translations?.pl?.excerpt || '');
  const [plContent, setPlContent] = useState(article.translations?.pl?.content || '');
  
  // ✅ v8.2.0: Multiple images (up to 5)
  const [selectedImages, setSelectedImages] = useState<string[]>(article.image ? [article.image] : []);
  
  // ✅ v8.2.0: Edit mode (single language or dual)
  const [editMode, setEditMode] = useState<'dual' | 'en' | 'pl'>('dual');
  
  // Image selection state
  const [imageSearch, setImageSearch] = useState('');
  const [imageOptions, setImageOptions] = useState<ImageOption[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Store
  const { removeJobFromQueue, addActivity, updateArticle } = useAdminStore();
  
  // ===== TIPTAP EDITOR =====
  const editor = useEditor({
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

  // ===== HANDLERS =====
  
  const handleSave = useCallback(() => {
    setIsSaving(true);
    
    // ✅ v8.2.0: Save both languages + multiple images
    updateArticle({
      id: article.id,
      title,
      excerpt,
      content,
      category,
      image: selectedImages[0] || imageUrl, // First image = hero
      images: selectedImages.slice(1), // Rest = content images
      translations: {
        en: { title, content, excerpt },
        pl: { title: plTitle, content: plContent, excerpt: plExcerpt }
      }
    });
    
    toast.success('✅ EN + PL saved!');
    setHasUnsavedChanges(false);
    setIsSaving(false);
  }, [article.id, title, excerpt, content, category, imageUrl, selectedImages, plTitle, plContent, plExcerpt, updateArticle]);

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
        toast.success('🎨 AI image generated!', { id: toastId });
      } else {
        toast.error(result.error || 'Failed to generate AI image', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to generate AI image', { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSelectImage = (option: ImageOption) => {
    setImageUrl(option.url);
    setHasUnsavedChanges(true);
    toast.success('✅ Image selected!');
  };

  const handleAddCustomImage = () => {
    if (!customImageUrl.trim()) return;
    
    setImageUrl(customImageUrl);
    setHasUnsavedChanges(true);
    setCustomImageUrl('');
    toast.success('✅ Custom image added!');
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setHasUnsavedChanges(true);
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
    
    setIsPublishing(true);
    const toastId = toast.loading('📤 Publishing article...');
    
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
            content,
            category,
            image: selectedImages[0] || imageUrl,
            images: selectedImages.slice(1),
            translations: {
              en: { title, content, excerpt },
              pl: { title: plTitle, content: plContent, excerpt: plExcerpt }
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        removeJobFromQueue(article.id);
        addActivity({
          type: 'article_published',
          message: `Article published: ${title}`,
          url: result.urls?.en || `/en/article/${article.id}`
        });
        toast.success(`✅ "${title.substring(0, 40)}..." published!`, { id: toastId });
        onPublish?.({ ...article, title, excerpt, content, category, image: imageUrl });
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
        title: article.translations?.pl?.title || title,
        excerpt: article.translations?.pl?.excerpt || excerpt,
        content: article.translations?.pl?.content || content
      };
    }
  };

  const previewContent = getPreviewContent();
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

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
              { id: 'preview', label: '👁️ Preview', icon: '3' }
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
          
          {/* STAGE 1: EDITING - DUAL LANGUAGE VIEW */}
          {stage === 'editing' && (
            <div className="p-6 space-y-6">
              {/* Edit Mode Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🌍 Dual-Language Editor
                </h3>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setEditMode('dual')}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                      editMode === 'dual' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🔀 Split
                  </button>
                  <button
                    onClick={() => setEditMode('en')}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                      editMode === 'en' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => setEditMode('pl')}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                      editMode === 'pl' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🇵🇱 PL
                  </button>
                </div>
              </div>

              {/* Category (shared) */}
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

              {/* Dual Language Columns */}
              <div className={`grid gap-6 ${editMode === 'dual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* ENGLISH Column */}
                {(editMode === 'dual' || editMode === 'en') && (
                  <div className={`space-y-4 p-4 rounded-xl border-2 ${editMode === 'dual' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                      <span className="text-xl">🇺🇸</span>
                      <span>English</span>
                      {title && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Ready</span>}
                    </div>
                    
                    {/* EN Title */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-full px-3 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500"
                        placeholder="English title..."
                      />
                    </div>
                    
                    {/* EN Excerpt */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">
                        Excerpt <span className={excerpt.length > 150 ? 'text-orange-500' : ''}>({excerpt.length}/160)</span>
                      </label>
                      <textarea
                        value={excerpt}
                        onChange={(e) => { setExcerpt(e.target.value.substring(0, 160)); setHasUnsavedChanges(true); }}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        placeholder="English excerpt..."
                      />
                    </div>
                    
                    {/* EN Content */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Content</label>
                      {(editMode === 'dual' || editMode === 'en') && (
                        <>
                          <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg border border-b-0 border-gray-300 dark:border-gray-600">
                            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded text-xs ${editor?.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}><strong>B</strong></button>
                            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded text-xs ${editor?.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}><em>I</em></button>
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1.5 rounded text-xs hover:bg-gray-200">H2</button>
                            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-1.5 rounded text-xs hover:bg-gray-200">• List</button>
                          </div>
                          <div className="border border-gray-300 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-800 min-h-[200px]">
                            <EditorContent editor={editor} />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} words
                    </div>
                  </div>
                )}

                {/* POLISH Column */}
                {(editMode === 'dual' || editMode === 'pl') && (
                  <div className={`space-y-4 p-4 rounded-xl border-2 ${editMode === 'dual' ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold">
                      <span className="text-xl">🇵🇱</span>
                      <span>Polski</span>
                      {plTitle && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Ready</span>}
                    </div>
                    
                    {/* PL Title */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Tytuł</label>
                      <input
                        type="text"
                        value={plTitle}
                        onChange={(e) => { setPlTitle(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-full px-3 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500"
                        placeholder="Polski tytuł..."
                      />
                    </div>
                    
                    {/* PL Excerpt */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">
                        Opis <span className={plExcerpt.length > 150 ? 'text-orange-500' : ''}>({plExcerpt.length}/160)</span>
                      </label>
                      <textarea
                        value={plExcerpt}
                        onChange={(e) => { setPlExcerpt(e.target.value.substring(0, 160)); setHasUnsavedChanges(true); }}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        placeholder="Polski opis..."
                      />
                    </div>
                    
                    {/* PL Content */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Treść</label>
                      <textarea
                        value={plContent}
                        onChange={(e) => { setPlContent(e.target.value); setHasUnsavedChanges(true); }}
                        rows={10}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[200px]"
                        placeholder="Polski treść artykułu..."
                      />
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {plContent.split(/\s+/).filter(Boolean).length} słów
                    </div>
                  </div>
                )}
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
                  <div className="grid grid-cols-5 gap-3">
                    {selectedImages.map((url, index) => (
                      <div key={url} className="relative rounded-xl overflow-hidden border-2 border-green-500 group">
                        <img src={url} alt={`Selected ${index + 1}`} className="w-full h-24 object-cover" />
                        <div className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                          {index + 1}
                        </div>
                        <button
                          onClick={() => setSelectedImages(prev => prev.filter(u => u !== url))}
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
                          setSelectedImages(prev => [...prev, result.url]);
                          setImageUrl(selectedImages.length === 0 ? result.url : imageUrl);
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
                            setSelectedImages(prev => [...prev, result.url]);
                            if (selectedImages.length === 0) setImageUrl(result.url);
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
                              setSelectedImages(prev => prev.filter(u => u !== option.url));
                            } else if (selectedImages.length < 5) {
                              setSelectedImages(prev => [...prev, option.url]);
                              if (selectedImages.length === 0) setImageUrl(option.url);
                            } else {
                              toast.error('Max 5 images!');
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
                <button onClick={() => setStage('preview')} className="text-gray-500 hover:text-gray-700 underline">
                  ⏭️ Skip and continue to preview
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: PREVIEW */}
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
                {imageUrl && (
                  <img
                    src={imageUrl}
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
                    dangerouslySetInnerHTML={{ __html: previewContent.content }}
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
                  onClick={() => setStage(stage === 'editing' ? 'images' : 'preview')}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
                >
                  {isPublishing ? '⏳ Publishing...' : '🚀 Publish Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

