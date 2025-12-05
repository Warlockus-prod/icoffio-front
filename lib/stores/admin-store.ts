import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { adminLogger, createApiTimer } from '../admin-logger';
import { localArticleStorage } from '../local-article-storage';

// Types
export interface ParseJob {
  id: string;
  url: string;
  status: 'pending' | 'parsing' | 'ai_processing' | 'translating' | 'images' | 'ready' | 'published' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  article?: Article;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  image?: string; // Primary article image URL
  images?: string[]; // ✅ НОВОЕ: Дополнительные изображения (2-3 шт)
  translations: {
    en?: { title: string; content: string; excerpt: string };
    pl?: { title: string; content: string; excerpt: string };
  };
  selectedImageId?: string;
  publishedAt?: Date;
  
  // ✨ NEW: Staged Processing
  processingStage?: 'text' | 'image-selection' | 'final';
  imageOptions?: {
    unsplash: ImageOption[];
    aiGenerated: ImageOption[];
  };
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
  type: 'url_added' | 'parsing_started' | 'parsing_completed' | 'article_published' | 'parsing_failed';
  message: string;
  timestamp: Date;
  url?: string;
  articleId?: string;
}

// Store Interface
interface AdminStore {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Current View
  activeTab: 'dashboard' | 'parser' | 'articles' | 'editor' | 'images' | 'queue' | 'settings' | 'logs' | 'advertising' | 'content-prompts';
  
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
  authenticate: (password: string) => boolean;
  logout: () => void;
  setActiveTab: (tab: AdminStore['activeTab']) => void;
  
  // Parsing Actions
  addUrlToQueue: (url: string, category: string) => void;
  addTextToQueue: (title: string, content: string, category: string) => Promise<void>;
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
  
  // ✨ NEW: Staged Processing Actions
  generateImageOptions: (articleId: string) => Promise<void>;
  selectImageOption: (articleId: string, optionIds: string[]) => void; // ✅ ИСПРАВЛЕНО: массив ID!
  regenerateImageOptions: (articleId: string) => Promise<void>;
  skipImageSelection: (articleId: string) => void;
  setArticleStage: (articleId: string, stage: Article['processingStage']) => void;
  
  // Statistics Actions
  updateStatistics: () => Promise<void>;
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
}

// Store Implementation
export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isLoading: false,
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

      // Authentication Actions
      authenticate: (password: string) => {
        const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'icoffio2025';
        if (password === adminPassword) {
          adminLogger.info('user', 'login_success', 'User successfully authenticated');
          set({ isAuthenticated: true });
          if (typeof window !== 'undefined') {
            localStorage.setItem('icoffio_admin_auth', 'authenticated');
          }
          return true;
        } else {
          adminLogger.warn('user', 'login_failed', 'Failed authentication attempt', { password: '***' });
        }
        return false;
      },

      logout: () => {
        adminLogger.info('user', 'logout', 'User logged out from admin panel');
        set({ isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('icoffio_admin_auth');
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      // Parsing Actions
      addUrlToQueue: (url, category) => {
        adminLogger.info('user', 'add_url', 'User added URL to parsing queue', { url, category });
        
        const newJob: ParseJob = {
          id: Date.now().toString(),
          url,
          status: 'pending',
          progress: 0,
          startTime: new Date(),
        };
        
        set((state) => ({
          parsingQueue: [...state.parsingQueue, newJob]
        }));

        get().addActivity({
          type: 'url_added',
          message: `URL добавлен в очередь парсинга: ${url}`,
          url
        });

      // Trigger parsing via API
      (get() as any).startParsing(newJob.id, url, category);
    },

    addTextToQueue: async (title, content, category) => {
      const newJob: ParseJob = {
        id: Date.now().toString(),
        url: `text:${title.substring(0, 50)}...`, // Псевдо-URL для отображения
        status: 'pending',
        progress: 0,
        startTime: new Date(),
      };
      
      set((state) => ({
        parsingQueue: [...state.parsingQueue, newJob]
      }));

      get().addActivity({
        type: 'url_added',
        message: `Текстовая статья добавлена в очередь: ${title}`,
        url: newJob.url
      });

      // Trigger text processing via API
      try {
        await (get() as any).startTextProcessing(newJob.id, title, content, category);
      } catch (error) {
        get().updateJobStatus(newJob.id, 'failed', 0);
        console.error('Error processing text:', error);
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
          parsingQueue: state.parsingQueue.filter(job => job.id !== jobId)
        }));
      },

      // Article Actions  
      selectArticle: (article) => set({ selectedArticle: article }),

      updateArticle: (updates) => {
        set((state) => ({
          selectedArticle: state.selectedArticle 
            ? { ...state.selectedArticle, ...updates }
            : null
        }));
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

      selectImageOption: (articleId: string, optionIds: string[]) => {
        set((state) => {
          const article = state.publishingQueue.find(a => a.id === articleId);
          if (!article || !article.imageOptions) return state;

          // Find all selected options
          const allOptions = [
            ...article.imageOptions.unsplash,
            ...article.imageOptions.aiGenerated
          ];
          const selectedOptions = allOptions.filter(opt => optionIds.includes(opt.id));

          if (selectedOptions.length === 0) return state;

          // Используем первое изображение как основное, остальные сохраняем в images[]
          const primaryImage = selectedOptions[0].url;
          const additionalImages = selectedOptions.slice(1).map(opt => opt.url);

          // Apply selected images to article
          return {
            publishingQueue: state.publishingQueue.map(a =>
              a.id === articleId
                ? {
                    ...a,
                    image: primaryImage,
                    selectedImageId: optionIds[0],
                    processingStage: 'final' as const,
                    // ✅ НОВОЕ: Сохраняем дополнительные изображения
                    images: additionalImages
                  }
                : a
            )
          };
        });

        console.log(`✅ ${optionIds.length} images selected for article ${articleId}`);
        console.log(`   Primary: ${optionIds[0]}`);
        if (optionIds.length > 1) {
          console.log(`   Additional: ${optionIds.slice(1).join(', ')}`);
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
      startParsing: async (jobId: string, url: string, category: string) => {
        const timer = createApiTimer('parse_url');
        adminLogger.info('parsing', 'parse_start', `Starting URL parsing: ${url}`, { jobId, url, category });
        
        try {
          get().updateJobStatus(jobId, 'parsing', 10);
          
          // ✅ ИСПРАВЛЕНИЕ: Увеличенный таймаут для облачной обработки
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            adminLogger.warn('parsing', 'parse_timeout', 'URL parsing timeout (180s)', { jobId, url });
            console.warn('⏰ Admin Store: Aborting URL parsing due to timeout (180s)');
            controller.abort();
          }, 180000); // 180 секунд (3 минуты) для полной обработки с OpenAI
          
          const response = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-from-url',
              url,
              category,
              stage: 'text-only' // ✨ NEW: Request text-only processing (no image generation)
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          const result = await response.json();
          
          if (result.success) {
            adminLogger.info('parsing', 'parse_success', `URL parsing completed successfully: ${url}`, { 
              jobId, 
              url, 
              title: result.data.stats.title,
              languages: result.data.stats.languages 
            });
            
            // ✅ СОХРАНЯЕМ СТАТЬИ В ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (отдельно для каждого языка)
            const storedArticles = localArticleStorage.convertApiResponseToArticle(result, 'url', url);
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
              // ✅ ИСПРАВЛЕНИЕ: Сохраняем imageOptions для выбора нескольких картинок
              imageOptions: result.imageOptions || undefined,
              processingStage: result.imageOptions ? 'image-selection' : 'final'
            };
            
            get().updateJobStatus(jobId, 'ready', 100, article);
            get().addActivity({
              type: 'parsing_completed',
              message: `Статья успешно обработана: ${stats.title}`,
              url
            });
            timer(); // End timer
          } else {
            adminLogger.error('parsing', 'parse_failed', `URL parsing failed: ${url}`, { 
              jobId, 
              url, 
              errors: result.errors 
            });
            
            get().updateJobStatus(jobId, 'failed', 0);
            get().addActivity({
              type: 'parsing_failed', 
              message: `Ошибка парсинга URL: ${url}`,
              url
            });
            timer(); // End timer
          }
        } catch (error) {
          // ✅ ИСПРАВЛЕНИЕ: Улучшенная обработка ошибок с подробными сообщениями
          console.error('❌ Admin Store: URL parsing failed:', error);
          let errorMessage = `Ошибка парсинга URL: ${url}`;
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = `Таймаут парсинга URL (60s): ${url}`;
            } else if (error.message.includes('fetch')) {
              errorMessage = `Сетевая ошибка при парсинге: ${url}`;
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
            url
          });
        }
      },

      startTextProcessing: async (jobId: string, title: string, content: string, category: string) => {
        try {
          get().updateJobStatus(jobId, 'parsing', 10);
          
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
              category,
              stage: 'text-only' // ✨ NEW: Request text-only processing (no image generation)
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
            }
          };
          
          get().updateJobStatus(jobId, 'ready', 100, article);
            get().addActivity({
              type: 'parsing_completed',
              message: `Текстовая статья успешно обработана: ${stats.title}`,
              url: `text:${title}`
            });
          } else {
            get().updateJobStatus(jobId, 'failed', 0);
            get().addActivity({
              type: 'parsing_failed', 
              message: `Ошибка обработки текста: ${title}`,
              url: `text:${title}`
            });
          }
        } catch (error) {
          // ✅ ИСПРАВЛЕНИЕ: Улучшенная обработка ошибок (аналогично startParsing)
          let errorMessage = `Ошибка обработки текста: ${title}`;
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = `Таймаут обработки текста (60s): ${title}`;
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
        }
      }
    }),
    {
      name: 'icoffio-admin-store'
    }
  )
);
