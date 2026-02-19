import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { adminLogger, createApiTimer } from '../admin-logger';
import { localArticleStorage } from '../local-article-storage';
import type { ArticleMonetizationSettings } from '../monetization-settings';

// Types
// Content processing styles (from content-prompts.ts)
export type ContentStyleType = 'journalistic' | 'as-is' | 'seo-optimized' | 'academic' | 'casual' | 'technical';

export interface ParseJob {
  id: string;
  url: string;
  sourceUrls?: string[];
  sourceText?: string;
  status: 'pending' | 'parsing' | 'ai_processing' | 'translating' | 'images' | 'ready' | 'published' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  article?: Article;
  contentStyle?: ContentStyleType; // ✅ v8.4.0: Стиль обработки контента
  category?: string; // ✅ v8.4.0: Категория статьи
}

interface TextProcessingOptions {
  skipEnhancement?: boolean;
  skipTranslation?: boolean;
  skipImageGeneration?: boolean;
  sourceUrls?: string[];
  includeSourceAttribution?: boolean;
  enableQualityGate?: boolean;
  minQualityScore?: number;
}

interface UrlProcessingOptions {
  sourceUrls?: string[];
  sourceText?: string;
  includeSourceAttribution?: boolean;
  enableQualityGate?: boolean;
  minQualityScore?: number;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  image?: string; // Primary article image URL (Hero)
  images?: string[]; // ✅ v8.2.0: До 5 изображений (первое = hero, остальные в контент)
  uploadedImages?: UploadedImageData[]; // ✅ v8.2.0: Загруженные с компьютера
  translations: {
    en?: { title: string; content: string; excerpt: string };
    pl?: { title: string; content: string; excerpt: string };
  };
  selectedImageId?: string;
  monetizationSettings?: ArticleMonetizationSettings;
  publishedAt?: Date;
  sourceUrls?: string[];
  sourceAttributions?: Array<{ label: string; url: string }>;
  sourceText?: string;
  includeSourceAttribution?: boolean;
  qualityGateEnabled?: boolean;
  minimumQualityScore?: number;
  
  // ✨ NEW: Staged Processing
  processingStage?: 'text' | 'image-selection' | 'final';
  imageOptions?: {
    unsplash: ImageOption[];
    aiGenerated: ImageOption[];
  };
}

// ✅ v8.2.0: Тип для загруженных изображений
export interface UploadedImageData {
  id: string;
  url: string; // data URL или blob URL
  filename: string;
  size: number;
  width?: number;
  height?: number;
  optimized?: boolean;
}

// ✨ NEW: Image Option for Selection Modal
export interface ImageOption {
  id: string;
  url: string;
  thumbnail?: string;
  source: 'unsplash' | 'ai' | 'custom';
  
  // Unsplash specific
  searchQuery?: string;
  author?: string;
  authorUrl?: string;
  
  // AI specific
  prompt?: string;
  model?: string;
  
  // Common
  width?: number;
  height?: number;
  description?: string;
}

export interface UnsplashImage {
  id: string;
  url: string;
  thumbnail: string;
  description: string;
  author: string;
  authorUrl?: string;
  width: number;
  height: number;
  aspectRatio: string;
  likes?: number;
  tags?: string[];
  source: 'unsplash';
}

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnail?: string;
  description: string;
  author: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  likes?: number;
  tags?: string[];
  prompt: string;
  style?: string;
  model?: string;
  source: 'openai';
}

export type ImageType = UnsplashImage | GeneratedImage;

export interface Statistics {
  urlsAddedToday: number;
  urlsAddedWeek: number;
  urlsAddedMonth: number;
  successfullyParsed: number;
  publishedArticles: number;
  failedParses: number;
  averageProcessingTime: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'url_added' | 'parsing_started' | 'parsing_completed' | 'article_published' | 'article_queued' | 'parsing_failed';
  message: string;
  timestamp: Date;
  url?: string;
  articleId?: string;
}

export type AdminRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AdminUser {
  email: string;
  role: AdminRole;
  isOwner?: boolean;
}

// Store Interface
interface AdminStore {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: AdminUser | null;
  
  // Current View
  activeTab: 'dashboard' | 'parser' | 'articles' | 'editor' | 'images' | 'queue' | 'settings' | 'logs' | 'advertising' | 'content-prompts' | 'activity' | 'telegram';
  
  // Parsing Queue
  parsingQueue: ParseJob[];
  
  // Articles
  selectedArticle: Article | null;
  publishingQueue: Article[];
  
  // Images
  availableImages: ImageType[];
  searchQuery: string;
  
  // Statistics
  statistics: Statistics;
  
  // Actions
  authenticate: (password: string, locale?: 'en' | 'pl') => Promise<{ success: boolean; message?: string; error?: string }>;
  checkSession: () => Promise<void>;
  hasRole: (requiredRole: AdminRole) => boolean;
  logout: () => Promise<void>;
  setActiveTab: (tab: AdminStore['activeTab']) => void;
  
  // Parsing Actions
  addUrlToQueue: (url: string, category: string, contentStyle?: ContentStyleType, options?: UrlProcessingOptions) => void;
  addTextToQueue: (title: string, content: string, category: string, options?: TextProcessingOptions) => Promise<void>;
  updateJobStatus: (jobId: string, status: ParseJob['status'], progress?: number, articleData?: Article | null) => void;
  removeJobFromQueue: (jobId: string) => void;
  
  // Article Actions
  selectArticle: (article: Article) => void;
  updateArticle: (updates: Partial<Article>) => void;
  addToPublishingQueue: (article: Article) => void;
  removeFromPublishingQueue: (articleId: string) => void;
  
  // Image Actions
  searchImages: (query: string) => Promise<void>;
  generateImage: (prompt: string) => Promise<void>;
  selectImage: (imageId: string) => void;
  
  // Staged Processing Actions
  generateImageOptions: (articleId: string) => Promise<void>;
  selectImageOption: (articleId: string, optionIds: string[], uploadedImages?: UploadedImageData[]) => void;
  regenerateImageOptions: (articleId: string) => Promise<void>;
  skipImageSelection: (articleId: string) => void;
  setArticleStage: (articleId: string, stage: Article['processingStage']) => void;
  
  // Statistics Actions
  updateStatistics: () => Promise<void>;
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;

  // Internal parsing methods (exposed on interface to avoid `as any` casts)
  startParsing: (
    jobId: string,
    url: string,
    category: string,
    contentStyle?: ContentStyleType,
    options?: UrlProcessingOptions
  ) => Promise<void>;
  startTextProcessing: (jobId: string, title: string, content: string, category: string, options?: TextProcessingOptions) => Promise<void>;
}

// Store Implementation
export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isLoading: false,
      currentUser: null,
      activeTab: 'dashboard',
      parsingQueue: [],
      selectedArticle: null,
      publishingQueue: [],
      availableImages: [],
      searchQuery: '',
      statistics: {
        urlsAddedToday: 0,
        urlsAddedWeek: 0,
        urlsAddedMonth: 0,
        successfullyParsed: 0,
        publishedArticles: 0,
        failedParses: 0,
        averageProcessingTime: 0,
        recentActivity: []
      },

      // Authentication — password session + RBAC through server-side API
      authenticate: async (password: string, locale: 'en' | 'pl' = 'en') => {
        try {
          const response = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'password_login',
              password,
            }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            const user: AdminUser = {
              email: String(result?.user?.email || 'admin@icoffio.com'),
              role: (result?.user?.role || 'owner') as AdminRole,
              isOwner: Boolean(result?.user?.isOwner ?? true),
            };
            set({
              isAuthenticated: true,
              currentUser: user,
            });
            adminLogger.info('user', 'login_password_success', `Admin password login for ${user.email}`);
            return {
              success: true,
              message: result.message || 'Signed in successfully.',
            };
          }

          return {
            success: false,
            error: result.error || 'Invalid password',
          };
        } catch (error) {
          console.error('API auth error:', error);
          return {
            success: false,
            error: 'Authentication request failed',
          };
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/admin/auth', {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include',
          });
          const result = await response.json();

          if (result?.success && result?.authenticated && result?.user) {
            const isOwner = Boolean(result.user.isOwner) || result.user.role === 'owner';
            const user: AdminUser = {
              email: String(result.user.email || ''),
              role: isOwner ? 'owner' : ((result.user.role || 'viewer') as AdminRole),
              isOwner,
            };

            set({
              isAuthenticated: true,
              currentUser: user,
            });
            adminLogger.info('user', 'session_restored', `Session restored for ${user.email}`);
          } else {
            set({
              isAuthenticated: false,
              currentUser: null,
            });
          }
        } catch (error) {
          console.error('Session check failed:', error);
          set({
            isAuthenticated: false,
            currentUser: null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      hasRole: (requiredRole: AdminRole) => {
        const userRole = get().currentUser?.role || 'viewer';
        const weight: Record<AdminRole, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };
        return weight[userRole] >= weight[requiredRole];
      },

      logout: async () => {
        try {
          await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' }),
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        adminLogger.info('user', 'logout', 'User logged out from admin panel');
        set({ isAuthenticated: false, currentUser: null });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      // Parsing Actions
      addUrlToQueue: (url, category, contentStyle = 'journalistic', options) => {
        const sourceUrls = Array.from(
          new Set(
            ((options?.sourceUrls && options.sourceUrls.length > 0 ? options.sourceUrls : [url]) || [])
              .map((item) => item.trim())
              .filter(Boolean)
          )
        ).slice(0, 5);
        const sourceText = options?.sourceText?.trim() || undefined;
        const displayUrl = sourceUrls[0] || url;
        const isMultiSource = sourceUrls.length > 1 || Boolean(sourceText);

        adminLogger.info('user', 'add_url', 'User added URL to parsing queue', {
          url: displayUrl,
          category,
          contentStyle,
          sourceUrlsCount: sourceUrls.length,
          hasSourceText: Boolean(sourceText)
        });
        
        const newJob: ParseJob = {
          id: Date.now().toString(),
          url: displayUrl,
          sourceUrls,
          sourceText,
          status: 'pending',
          progress: 0,
          startTime: new Date(),
          contentStyle,
          category,
        };
        
        set((state) => ({
          parsingQueue: [...state.parsingQueue, newJob]
        }));

        get().addActivity({
          type: 'url_added',
          message: isMultiSource
            ? `Multi-source задача добавлена: ${sourceUrls.length} URL${sourceText ? ' + text' : ''}`
            : `URL добавлен в очередь парсинга: ${displayUrl}`,
          url: displayUrl
        });

      // Trigger parsing via API
      get().startParsing(newJob.id, displayUrl, category, contentStyle, { sourceUrls, sourceText });
    },

    addTextToQueue: async (title, content, category, options) => {
      const sourceUrls = Array.from(
        new Set(
          (options?.sourceUrls || [])
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ).slice(0, 5);

      const newJob: ParseJob = {
        id: Date.now().toString(),
        url: `text:${title.substring(0, 50)}...`, // Псевдо-URL для отображения
        sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
      };
      
      set((state) => ({
        parsingQueue: [...state.parsingQueue, newJob]
      }));

      get().addActivity({
        type: 'url_added',
        message: sourceUrls.length > 0
          ? `Текстовая статья + ${sourceUrls.length} URL добавлена в очередь: ${title}`
          : `Текстовая статья добавлена в очередь: ${title}`,
        url: newJob.url
      });

      // Trigger text processing via API
      try {
        await get().startTextProcessing(newJob.id, title, content, category, options);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to process text article';

        get().updateJobStatus(newJob.id, 'failed', 0);
        set((state) => ({
          parsingQueue: state.parsingQueue.map(job =>
            job.id === newJob.id
              ? { ...job, error: errorMessage }
              : job
          )
        }));

        console.error('Error processing text:', error);
        throw new Error(errorMessage);
      }
    },

      updateJobStatus: (jobId, status, progress = 0, articleData = null) => {
        set((state) => ({
          parsingQueue: state.parsingQueue.map(job =>
            job.id === jobId
              ? { 
                  ...job, 
                  status, 
                  progress,
                  article: articleData || job.article,
                  endTime: ['ready', 'published', 'failed'].includes(status) ? new Date() : job.endTime
                }
              : job
          )
        }));
      },

      removeJobFromQueue: (jobId) => {
        set((state) => ({
          parsingQueue: state.parsingQueue.filter(job => job.id !== jobId && job.article?.id !== jobId)
        }));
      },

      // Article Actions  
      selectArticle: (article) => set({ selectedArticle: article }),

      updateArticle: (updates) => {
        set((state) => {
          const targetId = updates.id || state.selectedArticle?.id;

          const shouldUpdateSelected =
            Boolean(state.selectedArticle) &&
            (!targetId || state.selectedArticle!.id === targetId);

          const selectedArticle = shouldUpdateSelected && state.selectedArticle
            ? { ...state.selectedArticle, ...updates, id: state.selectedArticle.id }
            : state.selectedArticle;

          const parsingQueue = targetId
            ? state.parsingQueue.map((job) => {
                if (!job.article) return job;
                if (job.article.id !== targetId && job.id !== targetId) return job;
                return {
                  ...job,
                  article: { ...job.article, ...updates, id: job.article.id }
                };
              })
            : state.parsingQueue;

          const publishingQueue = targetId
            ? state.publishingQueue.map((queueArticle) =>
                queueArticle.id === targetId
                  ? { ...queueArticle, ...updates, id: queueArticle.id }
                  : queueArticle
              )
            : state.publishingQueue;

          return {
            selectedArticle: selectedArticle || null,
            parsingQueue,
            publishingQueue
          };
        });
      },

      addToPublishingQueue: (article) => {
        set((state) => ({
          publishingQueue: [...state.publishingQueue, article]
        }));
      },

      removeFromPublishingQueue: (articleId) => {
        set((state) => ({
          publishingQueue: state.publishingQueue.filter(a => a.id !== articleId)
        }));
      },

      // Image Actions
      searchImages: async (query) => {
        try {
          set({ searchQuery: query });
          const response = await fetch(`/api/admin/images?q=${encodeURIComponent(query)}`);
          const result = await response.json();
          if (result.success) {
            set({ availableImages: result.images });
          }
        } catch (error) {
          console.error('Failed to search images:', error);
        }
      },

      generateImage: async (prompt) => {
        try {
          const response = await fetch('/api/admin/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
          });
          const result = await response.json();
          
          if (result.success) {
            set((state) => ({
              availableImages: [result.image, ...state.availableImages]
            }));
          }
        } catch (error) {
          console.error('Failed to generate image:', error);
        }
      },

      selectImage: (imageId) => {
        const { selectedArticle } = get();
        if (selectedArticle) {
          get().updateArticle({ selectedImageId: imageId });
        }
      },

      // ✨ NEW: Staged Processing Actions
      generateImageOptions: async (articleId: string) => {
        const article = get().publishingQueue.find(a => a.id === articleId);
        if (!article) {
          console.error('Article not found:', articleId);
          return;
        }

        try {
          console.log('🎨 Generating image options for:', article.title);
          
          const response = await fetch('/api/articles/image-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId,
              title: article.title,
              category: article.category,
              excerpt: article.excerpt
            })
          });

          if (response.ok) {
            const imageOptions = await response.json();
            
            // Update article with image options
            set((state) => ({
              publishingQueue: state.publishingQueue.map(a =>
                a.id === articleId
                  ? { ...a, imageOptions, processingStage: 'image-selection' as const }
                  : a
              )
            }));

            console.log('✅ Image options generated successfully');
          }
        } catch (error) {
          console.error('Failed to generate image options:', error);
        }
      },

      selectImageOption: (articleId: string, optionIds: string[], uploadedImages?: UploadedImageData[]) => {
        set((state) => {
          const article = state.publishingQueue.find(a => a.id === articleId);
          if (!article) return state;

          // Собираем все URL изображений
          const allImageUrls: string[] = [];
          
          // 1. Добавляем выбранные из Unsplash/AI
          if (article.imageOptions) {
            const allOptions = [
              ...article.imageOptions.unsplash,
              ...article.imageOptions.aiGenerated
            ];
            const selectedOptions = allOptions.filter(opt => optionIds.includes(opt.id));
            allImageUrls.push(...selectedOptions.map(opt => opt.url));
          }
          
          // 2. Добавляем загруженные пользователем
          if (uploadedImages && uploadedImages.length > 0) {
            allImageUrls.push(...uploadedImages.map(img => img.url));
          }

          if (allImageUrls.length === 0) return state;

          // ✅ v8.2.0: Первое = Hero, остальные в контент (до 5 штук)
          const primaryImage = allImageUrls[0];
          const additionalImages = allImageUrls.slice(1, 5); // Макс 4 дополнительных (всего 5)

          // Apply selected images to article
          return {
            publishingQueue: state.publishingQueue.map(a =>
              a.id === articleId
                ? {
                    ...a,
                    image: primaryImage,
                    selectedImageId: optionIds[0] || uploadedImages?.[0]?.id,
                    processingStage: 'final' as const,
                    images: additionalImages,
                    uploadedImages: uploadedImages || []
                  }
                : a
            )
          };
        });

        const totalCount = optionIds.length + (uploadedImages?.length || 0);
        console.log(`✅ ${totalCount} images selected for article ${articleId}`);
        console.log(`   🏆 Hero (1st): ${optionIds[0] || uploadedImages?.[0]?.id}`);
        if (totalCount > 1) {
          console.log(`   📄 Content (2-5): ${totalCount - 1} additional images`);
        }
      },

      regenerateImageOptions: async (articleId: string) => {
        console.log('🔄 Regenerating image options for:', articleId);
        // Simply call generateImageOptions again - it will create new variants
        await get().generateImageOptions(articleId);
      },

      skipImageSelection: (articleId: string) => {
        set((state) => ({
          publishingQueue: state.publishingQueue.map(a =>
            a.id === articleId
              ? { ...a, processingStage: 'final' as const, image: undefined }
              : a
          )
        }));

        console.log(`⏭️ Image selection skipped for article ${articleId}`);
      },

      setArticleStage: (articleId: string, stage: Article['processingStage']) => {
        set((state) => ({
          publishingQueue: state.publishingQueue.map(a =>
            a.id === articleId
              ? { ...a, processingStage: stage }
              : a
          )
        }));
      },

      // Statistics Actions
      updateStatistics: async () => {
        try {
          const response = await fetch('/api/admin/statistics');
          const statistics = await response.json();
          set({ statistics });
        } catch (error) {
          console.error('Failed to update statistics:', error);
        }
      },

      addActivity: (activity) => {
        const newActivity: ActivityItem = {
          ...activity,
          id: Date.now().toString(),
          timestamp: new Date()
        };

        set((state) => ({
          statistics: {
            ...state.statistics,
            recentActivity: [newActivity, ...state.statistics.recentActivity.slice(0, 49)]
          }
        }));
      },

      // Private method for starting parsing
      startParsing: async (
        jobId: string,
        url: string,
        category: string,
        contentStyle: ContentStyleType = 'journalistic',
        options?: UrlProcessingOptions
      ) => {
        const sourceUrls = Array.from(
          new Set(
            ((options?.sourceUrls && options.sourceUrls.length > 0 ? options.sourceUrls : [url]) || [])
              .map((item) => item.trim())
              .filter(Boolean)
          )
        ).slice(0, 5);
        const sourceText = options?.sourceText?.trim() || undefined;
        const includeSourceAttribution = options?.includeSourceAttribution ?? true;
        const qualityGateEnabled = options?.enableQualityGate ?? true;
        const minimumQualityScore = options?.minQualityScore ?? 65;
        const mainUrl = sourceUrls[0] || url;
        const isMultiSource = sourceUrls.length > 1 || Boolean(sourceText);
        const timer = createApiTimer('parse_url');
        adminLogger.info(
          'parsing',
          'parse_start',
          `Starting URL parsing: ${isMultiSource ? `${sourceUrls.length} URLs` : mainUrl}`,
          { jobId, url: mainUrl, category, contentStyle, sourceUrlsCount: sourceUrls.length, hasSourceText: Boolean(sourceText) }
        );
        
        try {
          get().updateJobStatus(jobId, 'parsing', 10);
          
          // ✅ ИСПРАВЛЕНИЕ: Увеличенный таймаут для облачной обработки
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            adminLogger.warn('parsing', 'parse_timeout', 'URL parsing timeout (180s)', { jobId, url: mainUrl });
            console.warn('⏰ Admin Store: Aborting URL parsing due to timeout (180s)');
            controller.abort();
          }, 180000); // 180 секунд (3 минуты) для полной обработки с OpenAI
          
          const response = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-from-url',
              url: mainUrl,
              ...(isMultiSource ? { urls: sourceUrls } : {}),
              ...(sourceText ? { content: sourceText } : {}),
              includeSourceAttribution,
              qualityGateEnabled,
              minimumQualityScore,
              category,
              contentStyle, // ✅ v8.4.0: Передаем стиль обработки
              stage: 'text-only' // ✨ NEW: Request text-only processing (no image generation)
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const responseContentType = response.headers.get('content-type') || '';
          const result = responseContentType.includes('application/json')
            ? await response.json()
            : { success: false, error: await response.text() };
          
          if (response.ok && result.success) {
            adminLogger.info('parsing', 'parse_success', `URL parsing completed successfully: ${mainUrl}`, { 
              jobId, 
              url: mainUrl, 
              title: result.data.stats.title,
              languages: result.data.stats.languages 
            });
            
            // ✅ СОХРАНЯЕМ СТАТЬИ В ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (отдельно для каждого языка)
            const storedArticles = localArticleStorage.convertApiResponseToArticle(
              result,
              'url',
              isMultiSource ? sourceUrls.join('\n') : mainUrl
            );
            localArticleStorage.saveArticles(storedArticles);
            
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда используем EN как основную статью!
            const { posts, stats } = result.data;
            
            // ВСЕГДА берем английскую версию как основную (даже если парсили русскую)
            const enPost = posts.en || posts[Object.keys(posts)[0]]; // Fallback на первый язык если EN нет
            
            // Формируем объект Article в нужном формате
            const firstStoredArticle = storedArticles[0];
            const article: Article = {
              id: firstStoredArticle.id,
              title: enPost.title,           // ✅ АНГЛИЙСКИЙ заголовок как основной!
              content: enPost.content,       // ✅ АНГЛИЙСКИЙ контент как основной!
              excerpt: enPost.excerpt,       // ✅ АНГЛИЙСКИЙ excerpt как основной!
              category: stats.category,
              author: enPost.author || 'AI Assistant',
              translations: {
                en: posts.en ? {
                  title: posts.en.title,
                  content: posts.en.content, 
                  excerpt: posts.en.excerpt
                } : undefined,
                pl: posts.pl ? {
                  title: posts.pl.title,
                  content: posts.pl.content,
                  excerpt: posts.pl.excerpt  
                } : undefined
              },
              sourceUrls,
              sourceAttributions: Array.isArray(result.data?.sourceAttributions)
                ? result.data.sourceAttributions
                : undefined,
              sourceText,
              includeSourceAttribution,
              qualityGateEnabled,
              minimumQualityScore,
              // ✅ ИСПРАВЛЕНИЕ: Сохраняем imageOptions для выбора нескольких картинок
              imageOptions: result.imageOptions || undefined,
              processingStage: result.imageOptions ? 'image-selection' : 'final'
            };
            
            get().updateJobStatus(jobId, 'ready', 100, article);
            get().addActivity({
              type: 'parsing_completed',
              message: `Статья успешно обработана: ${stats.title}`,
              url: mainUrl
            });
            timer(); // End timer
          } else {
            const backendError =
              result?.error ||
              result?.errors?.[0] ||
              (typeof result === 'string' ? result.substring(0, 300) : '') ||
              `HTTP ${response.status}`;
            const errorMessage = `Ошибка парсинга URL: ${backendError}`;

            adminLogger.error('parsing', 'parse_failed', `URL parsing failed: ${mainUrl}`, { 
              jobId, 
              url: mainUrl, 
              status: response.status,
              errors: result?.errors,
              error: backendError
            });
            
            get().updateJobStatus(jobId, 'failed', 0);
            set((state) => ({
              parsingQueue: state.parsingQueue.map(job =>
                job.id === jobId
                  ? { ...job, error: errorMessage }
                  : job
              )
            }));

            get().addActivity({
              type: 'parsing_failed', 
              message: errorMessage,
              url: mainUrl
            });
            timer(); // End timer
          }
        } catch (error) {
          // ✅ ИСПРАВЛЕНИЕ: Улучшенная обработка ошибок с подробными сообщениями
          console.error('❌ Admin Store: URL parsing failed:', error);
          let errorMessage = `Ошибка парсинга URL: ${mainUrl}`;
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = `Таймаут парсинга URL (180s): ${mainUrl}`;
            } else if (error.message.includes('fetch')) {
              errorMessage = `Сетевая ошибка при парсинге: ${mainUrl}`;
            } else {
              errorMessage = `Ошибка парсинга: ${error.message}`;
            }
          }
          
          // Обновляем статус с подробной ошибкой
          get().updateJobStatus(jobId, 'failed', 0);
          
          // Находим job и сохраняем ошибку
          set((state) => ({
            parsingQueue: state.parsingQueue.map(job =>
              job.id === jobId
                ? { ...job, error: errorMessage }
                : job
            )
          }));
          
          get().addActivity({
            type: 'parsing_failed',
            message: errorMessage,
            url: mainUrl
          });
        }
      },

      startTextProcessing: async (jobId: string, title: string, content: string, category: string, options) => {
        try {
          get().updateJobStatus(jobId, 'parsing', 10);
          const normalizedCategory = ['ai', 'apple', 'games', 'tech'].includes(category) ? category : 'tech';
          const sourceUrls = Array.from(
            new Set(
              (options?.sourceUrls || [])
                .map((item) => item.trim())
                .filter(Boolean)
            )
          ).slice(0, 5);
          const includeSourceAttribution = options?.includeSourceAttribution ?? true;
          const qualityGateEnabled = options?.enableQualityGate ?? true;
          const minimumQualityScore = options?.minQualityScore ?? 65;
          
          // ✅ ИСПРАВЛЕНИЕ: Увеличенный таймаут для облачной обработки
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn('⏰ Admin Store: Aborting text processing due to timeout (180s)');
            controller.abort();
          }, 180000); // 180 секунд (3 минуты) для полной обработки с OpenAI
          
          const response = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-from-text',
              title,
              content,
              ...(sourceUrls.length > 0
                ? { sourceUrls }
                : {}),
              includeSourceAttribution,
              qualityGateEnabled,
              minimumQualityScore,
              category: normalizedCategory,
              stage: 'text-only', // ✨ NEW: Request text-only processing (no image generation)
              enhanceContent: options?.skipEnhancement ? false : true,
              translateToAll: options?.skipTranslation ? false : true,
              generateImage: options?.skipImageGeneration !== undefined ? !options.skipImageGeneration : false
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          const result = await response.json();
          
        if (result.success) {
          // ✅ СОХРАНЯЕМ СТАТЬИ В ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (отдельно для каждого языка)
          const storedArticles = localArticleStorage.convertApiResponseToArticle(result, 'text');
          localArticleStorage.saveArticles(storedArticles);
          
          // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда используем EN как основную статью!
          const { posts, stats } = result.data;
          
          // ВСЕГДА берем английскую версию как основную (даже если парсили русскую)
          const enPost = posts.en || posts[Object.keys(posts)[0]]; // Fallback на первый язык если EN нет
          
          // Формируем объект Article в нужном формате
          const firstStoredArticle = storedArticles[0];
          const article: Article = {
            id: firstStoredArticle.id,
            title: enPost.title,           // ✅ АНГЛИЙСКИЙ заголовок как основной!
            content: enPost.content,       // ✅ АНГЛИЙСКИЙ контент как основной!
            excerpt: enPost.excerpt,       // ✅ АНГЛИЙСКИЙ excerpt как основной!
            category: stats.category,
            author: enPost.author || 'AI Assistant',
            translations: {
              en: posts.en ? {
                title: posts.en.title,
                content: posts.en.content, 
                excerpt: posts.en.excerpt
              } : undefined,
              pl: posts.pl ? {
                title: posts.pl.title,
                content: posts.pl.content,
                excerpt: posts.pl.excerpt  
              } : undefined
            },
            sourceUrls,
            includeSourceAttribution,
            qualityGateEnabled,
            minimumQualityScore,
          };
          
          get().updateJobStatus(jobId, 'ready', 100, article);
            get().addActivity({
              type: 'parsing_completed',
              message: `Текстовая статья успешно обработана: ${stats.title}`,
              url: `text:${title}`
            });
          } else {
            const errorMessage = result.error || `Ошибка обработки текста: ${title}`;

            get().updateJobStatus(jobId, 'failed', 0);
            set((state) => ({
              parsingQueue: state.parsingQueue.map(job =>
                job.id === jobId
                  ? { ...job, error: errorMessage }
                  : job
              )
            }));

            get().addActivity({
              type: 'parsing_failed', 
              message: errorMessage,
              url: `text:${title}`
            });

            throw new Error(errorMessage);
          }
        } catch (error) {
          // ✅ ИСПРАВЛЕНИЕ: Улучшенная обработка ошибок (аналогично startParsing)
          let errorMessage = `Ошибка обработки текста: ${title}`;
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = `Таймаут обработки текста (180s): ${title}`;
            } else if (error.message.includes('fetch')) {
              errorMessage = `Сетевая ошибка при обработке текста: ${title}`;
            } else {
              errorMessage = `Ошибка обработки текста: ${error.message}`;
            }
          }
          
          // Обновляем статус с подробной ошибкой
          get().updateJobStatus(jobId, 'failed', 0);
          
          // Находим job и сохраняем ошибку
          set((state) => ({
            parsingQueue: state.parsingQueue.map(job =>
              job.id === jobId
                ? { ...job, error: errorMessage }
                : job
            )
          }));
          
          get().addActivity({
            type: 'parsing_failed',
            message: errorMessage,
            url: `text:${title}`
          });

          throw new Error(errorMessage);
        }
      }
    }),
    {
      name: 'icoffio-admin-store'
    }
  )
);
