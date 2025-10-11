/**
 * 💾 ЛОКАЛЬНОЕ ХРАНИЛИЩЕ СТАТЕЙ ДЛЯ АДМИН ПАНЕЛИ
 * Сохраняет созданные статьи локально для редактирования и публикации
 */

export interface StoredArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  category: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
  image?: string;
  status: 'draft' | 'ready' | 'published';
  translations: Record<string, {
    title: string;
    content: string;
    excerpt: string;
    slug: string;
  }>;
  source: {
    type: 'url' | 'text' | 'ai';
    originalUrl?: string;
  };
}

class LocalArticleStorage {
  private storageKey = 'icoffio_admin_articles';

  /**
   * Получить все статьи из localStorage
   */
  getAllArticles(): StoredArticle[] {
    try {
      if (typeof window === 'undefined') return [];
      
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const articles = JSON.parse(stored);
      return Array.isArray(articles) ? articles : [];
    } catch (error) {
      console.error('Error loading articles from storage:', error);
      return [];
    }
  }

  /**
   * Сохранить статью в localStorage
   */
  saveArticle(article: StoredArticle): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      const articles = this.getAllArticles();
      const existingIndex = articles.findIndex(a => a.id === article.id);
      
      if (existingIndex >= 0) {
        articles[existingIndex] = { ...article, updatedAt: new Date().toISOString() };
      } else {
        articles.unshift(article);
      }
      
      // Ограничиваем количество статей
      const limitedArticles = articles.slice(0, 100);
      
      localStorage.setItem(this.storageKey, JSON.stringify(limitedArticles));
      return true;
    } catch (error) {
      console.error('Error saving article to storage:', error);
      return false;
    }
  }

  /**
   * Получить статью по ID
   */
  getArticle(id: string): StoredArticle | null {
    const articles = this.getAllArticles();
    return articles.find(a => a.id === id) || null;
  }

  /**
   * Удалить статью
   */
  deleteArticle(id: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      const articles = this.getAllArticles();
      const filtered = articles.filter(a => a.id !== id);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting article:', error);
      return false;
    }
  }

  /**
   * Обновить статус статьи
   */
  updateArticleStatus(id: string, status: StoredArticle['status']): boolean {
    try {
      const articles = this.getAllArticles();
      const article = articles.find(a => a.id === id);
      
      if (article) {
        article.status = status;
        article.updatedAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(articles));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating article status:', error);
      return false;
    }
  }

  /**
   * Получить статьи по статусу
   */
  getArticlesByStatus(status: StoredArticle['status']): StoredArticle[] {
    return this.getAllArticles().filter(a => a.status === status);
  }

  /**
   * Конвертировать API ответ в StoredArticle
   */
  convertApiResponseToArticle(apiResponse: any, sourceType: 'url' | 'text' | 'ai', originalUrl?: string): StoredArticle {
    const { posts, stats } = apiResponse.data;
    const ruPost = posts.ru;
    
    return {
      id: `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: stats.title,
      content: ruPost.content,
      excerpt: stats.excerpt,
      slug: stats.slug,
      category: stats.category,
      author: ruPost.author || 'AI Assistant',
      createdAt: new Date().toISOString(),
      image: ruPost.image,
      status: 'ready',
      translations: {
        en: posts.en ? {
          title: posts.en.title,
          content: posts.en.content,
          excerpt: posts.en.excerpt,
          slug: posts.en.slug
        } : {} as any,
        pl: posts.pl ? {
          title: posts.pl.title,
          content: posts.pl.content,
          excerpt: posts.pl.excerpt,
          slug: posts.pl.slug
        } : {} as any
      },
      source: {
        type: sourceType,
        originalUrl
      }
    };
  }

  /**
   * Очистить все статьи
   */
  clearAll(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Error clearing articles:', error);
      return false;
    }
  }

  /**
   * Получить статистику
   */
  getStats(): {
    total: number;
    byStatus: Record<StoredArticle['status'], number>;
    byCategory: Record<string, number>;
    recentlyCreated: number;
  } {
    const articles = this.getAllArticles();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = {
      total: articles.length,
      byStatus: {
        draft: 0,
        ready: 0,
        published: 0
      } as Record<StoredArticle['status'], number>,
      byCategory: {} as Record<string, number>,
      recentlyCreated: 0
    };
    
    articles.forEach(article => {
      stats.byStatus[article.status]++;
      stats.byCategory[article.category] = (stats.byCategory[article.category] || 0) + 1;
      
      if (new Date(article.createdAt) > oneDayAgo) {
        stats.recentlyCreated++;
      }
    });
    
    return stats;
  }
}

// Глобальный экземпляр
export const localArticleStorage = new LocalArticleStorage();
