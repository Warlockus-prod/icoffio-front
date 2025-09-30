import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  translations: {
    en?: { title: string; content: string; excerpt: string };
    pl?: { title: string; content: string; excerpt: string };
  };
  selectedImageId?: string;
  publishedAt?: Date;
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
  activeTab: 'dashboard' | 'parser' | 'editor' | 'images' | 'queue' | 'settings';
  
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
          set({ isAuthenticated: true });
          if (typeof window !== 'undefined') {
            localStorage.setItem('icoffio_admin_auth', 'authenticated');
          }
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('icoffio_admin_auth');
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      // Parsing Actions
      addUrlToQueue: (url, category) => {
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
        try {
          get().updateJobStatus(jobId, 'parsing', 10);
          
          const response = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-from-url',
              url,
              category
            })
          });

          const result = await response.json();
          
          if (result.success) {
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Создаем правильную структуру Article из API данных
            const { posts, stats } = result.data;
            const primaryLang = Object.keys(posts)[0]; // Первый язык (обычно ru)
            const primaryPost = posts[primaryLang];
            
            // Формируем объект Article в нужном формате
            const article: Article = {
              id: `article-${Date.now()}`,
              title: stats.title,
              content: primaryPost.content,
              excerpt: stats.excerpt,
              category: stats.category,
              author: primaryPost.author || 'AI Assistant',
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
              message: `Статья успешно обработана: ${stats.title}`,
              url
            });
          } else {
            get().updateJobStatus(jobId, 'failed', 0);
            get().addActivity({
              type: 'parsing_failed', 
              message: `Ошибка парсинга URL: ${url}`,
              url
            });
          }
        } catch (error) {
          get().updateJobStatus(jobId, 'failed', 0);
          get().addActivity({
            type: 'parsing_failed',
            message: `Ошибка парсинга URL: ${url}`,
            url
          });
        }
      }
    }),
    {
      name: 'icoffio-admin-store'
    }
  )
);
