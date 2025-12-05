'use client';

import { useState, useEffect } from 'react';
import { localArticleStorage, type StoredArticle } from '@/lib/local-article-storage';
import { getLocalArticles } from '@/lib/local-articles';
import { adminLogger } from '@/lib/admin-logger';
import type { Post } from '@/lib/types';
import MobileArticleCard from './MobileArticleCard';
import AdvancedSearchPanel, { type SearchFilters } from './AdvancedSearchPanel';

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  language: string;
  createdAt: string;
  status: 'static' | 'dynamic' | 'admin';
  url: string;
  excerpt: string;
  image?: string;
  author?: string;
  views?: number;
  lastEdit?: string;
  publishStatus?: 'draft' | 'published';
}

export default function ArticlesManager() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: 'all',
    status: 'all',
    language: 'all',
    dateFrom: '',
    dateTo: '',
    author: '',
    viewsMin: '',
    viewsMax: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    byLanguage: { en: 0, pl: 0 },
    byCategory: { ai: 0, apple: 0, tech: 0, games: 0, digital: 0 },
    byStatus: { static: 0, dynamic: 0, admin: 0 }
  });
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    category: true,
    language: true,
    status: true,
    created: true,
    author: true,
    views: true,
    lastEdit: true,
    publishStatus: true,
  });

  // Загрузка всех статей
  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const allArticles: ArticleItem[] = [];
      
      // 1. Статьи из Supabase (published)
      try {
        const response = await fetch('/api/supabase-articles?action=get-all&limit=100');
        const result = await response.json();
        
        if (result.success && result.articles) {
          result.articles.forEach((article: any) => {
            // English version
            if (article.slug_en) {
              allArticles.push({
                id: `supabase_${article.id}_en`,
                title: article.title_en || article.title,
                slug: article.slug_en,
                category: article.category || 'tech',
                language: 'en',
                createdAt: article.created_at,
                status: 'dynamic' as const,
                url: `https://app.icoffio.com/en/article/${article.slug_en}`,
                excerpt: article.excerpt_en || article.excerpt || '',
                image: article.image_url || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
                author: article.author || 'icoffio Editorial Team',
                views: article.views || Math.floor(Math.random() * 1000) + 50,
                lastEdit: article.updated_at || article.created_at,
                publishStatus: 'published' as const
              });
            }
            
            // Polish version
            if (article.slug_pl) {
              allArticles.push({
                id: `supabase_${article.id}_pl`,
                title: article.title_pl || article.title,
                slug: article.slug_pl,
                category: article.category || 'tech',
                language: 'pl',
                createdAt: article.created_at,
                status: 'dynamic' as const,
                url: `https://app.icoffio.com/pl/article/${article.slug_pl}`,
                excerpt: article.excerpt_pl || article.excerpt || '',
                image: article.image_url || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
                author: article.author || 'icoffio Editorial Team',
                views: article.views || Math.floor(Math.random() * 1000) + 50,
                lastEdit: article.updated_at || article.created_at,
                publishStatus: 'published' as const
              });
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load Supabase articles:', error);
      }
      
      // 2. Статьи из админ localStorage
      const adminArticles = localArticleStorage.getAllArticles();
      adminArticles.forEach(article => {
        const language = article.slug.endsWith('-en') ? 'en' : 
                        article.slug.endsWith('-pl') ? 'pl' : 'unknown';
        
        allArticles.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
          category: article.category,
          language,
          createdAt: article.createdAt,
          status: 'admin',
          url: `https://app.icoffio.com/${language}/article/${article.slug}`,
          excerpt: article.excerpt,
          image: article.image || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
          author: article.author || 'icoffio Editorial Team',
          views: Math.floor(Math.random() * 1000) + 50,
          lastEdit: article.updatedAt || article.createdAt,
          publishStatus: 'draft' as const
        });
      });
      
      // 3. Статические статьи
      const staticArticles = await getLocalArticles();
      staticArticles.forEach((article: Post) => {
        const language = article.slug.endsWith('-en') ? 'en' : 
                        article.slug.endsWith('-pl') ? 'pl' : 'unknown';
        
        allArticles.push({
          id: `static_${article.slug}`,
          title: article.title,
          slug: article.slug,
          category: typeof article.category === 'string' ? article.category : article.category.slug,
          language,
          author: 'icoffio Editorial Team',
          views: Math.floor(Math.random() * 5000) + 100,
          lastEdit: article.publishedAt || article.date || new Date().toISOString(),
          publishStatus: 'published' as const,
          createdAt: article.publishedAt || article.date || new Date().toISOString(),
          status: 'static',
          url: `https://app.icoffio.com/${language}/article/${article.slug}`,
          excerpt: article.excerpt,
          image: article.image || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800'
        });
      });
      
      // Убираем дубликаты по slug
      const uniqueArticles = allArticles.filter((article, index, self) => 
        index === self.findIndex(a => a.slug === article.slug)
      );
      
      // Сортируем по дате создания (новые сверху)
      uniqueArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setArticles(uniqueArticles);
      updateStats(uniqueArticles);
      
    } catch (error) {
      console.error('Error loading articles:', error);
      adminLogger.error('system', 'load_articles_failed', 'Failed to load articles for management', { error });
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление статистики
  const updateStats = (articlesList: ArticleItem[]) => {
    const stats = {
      total: articlesList.length,
      byLanguage: { en: 0, pl: 0 },
      byCategory: { ai: 0, apple: 0, tech: 0, games: 0, digital: 0 },
      byStatus: { static: 0, dynamic: 0, admin: 0 }
    };
    
    articlesList.forEach(article => {
      if (article.language === 'en' || article.language === 'pl') {
        stats.byLanguage[article.language]++;
      }
      
      if (article.category in stats.byCategory) {
        stats.byCategory[article.category as keyof typeof stats.byCategory]++;
      }
      
      if (article.status in stats.byStatus) {
        stats.byStatus[article.status as keyof typeof stats.byStatus]++;
      }
    });
    
    setStats(stats);
  };

  // Расширенная фильтрация статей
  const filteredArticles = articles.filter(article => {
    // Language filter
    if (filters.language !== 'all' && article.language !== filters.language) return false;
    
    // Category filter
    if (filters.category !== 'all' && article.category !== filters.category) return false;
    
    // Status filter
    if (filters.status !== 'all' && article.status !== filters.status) return false;
    
    // Search filter (title, content, author)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = article.title.toLowerCase().includes(searchLower);
      const matchesExcerpt = article.excerpt.toLowerCase().includes(searchLower);
      const matchesAuthor = article.author?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesExcerpt && !matchesAuthor) return false;
    }
    
    // Date range filter
    if (filters.dateFrom) {
      const articleDate = new Date(article.createdAt);
      const fromDate = new Date(filters.dateFrom);
      if (articleDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const articleDate = new Date(article.createdAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59); // End of day
      if (articleDate > toDate) return false;
    }
    
    // Author filter
    if (filters.author) {
      if (!article.author?.toLowerCase().includes(filters.author.toLowerCase())) return false;
    }
    
    // Views range filter
    if (filters.viewsMin && article.views !== undefined) {
      if (article.views < parseInt(filters.viewsMin)) return false;
    }
    if (filters.viewsMax && article.views !== undefined) {
      if (article.views > parseInt(filters.viewsMax)) return false;
    }
    
    return true;
  });

  // Обработка чекбоксов
  const handleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const handleSelectArticle = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // Массовое удаление
  const handleBulkDelete = () => {
    const selectedCount = selectedArticles.size;
    const articlesToDelete = filteredArticles.filter(a => selectedArticles.has(a.id));
    const staticCount = articlesToDelete.filter(a => a.status === 'static').length;
    
    if (staticCount > 0) {
      alert(`⚠️ Cannot delete static articles!\n\n${staticCount} of selected articles are static and cannot be deleted.\nOnly admin-created articles can be deleted.`);
      return;
    }

    if (!window.confirm(`🗑️ Delete ${selectedCount} selected articles?\n\nThis action cannot be undone!\n\nContinue?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const adminArticles = localArticleStorage.getAllArticles();
      const adminIds = articlesToDelete
        .filter(a => a.status === 'admin')
        .map(a => a.id);
      
      // Удаляем по ID
      const remaining = adminArticles.filter(article => !adminIds.includes(article.id));
      localStorage.setItem('icoffio_admin_articles', JSON.stringify(remaining));
      
      adminLogger.info('user', 'bulk_delete_articles', `Bulk deleted ${selectedCount} articles`, { 
        deletedIds: adminIds,
        count: selectedCount 
      });
      
      alert(`✅ Successfully deleted ${selectedCount} articles!`);
      setSelectedArticles(new Set());
      loadArticles();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('❌ Failed to delete articles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка при монтировании и автообновление
  useEffect(() => {
    loadArticles();
    const interval = setInterval(loadArticles, 30000); // Обновляем каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Получение флага языка
  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case 'en': return '🇺🇸';
      case 'pl': return '🇵🇱';
      default: return '🏳️';
    }
  };

  // Получение иконки категории
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai': return '🤖';
      case 'apple': return '🍎';
      case 'tech': return '⚙️';
      case 'games': return '🎮';
      case 'digital': return '📱';
      default: return '📄';
    }
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'static': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'admin': return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'dynamic': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      default: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Advanced Search */}
      <AdvancedSearchPanel
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters({
          search: '',
          category: 'all',
          status: 'all',
          language: 'all',
          dateFrom: '',
          dateTo: '',
          author: '',
          viewsMin: '',
          viewsMax: ''
        })}
        totalResults={articles.length}
        filteredResults={filteredArticles.length}
      />

      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📚 All Articles Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all articles, delete unwanted content, and monitor your content library
            </p>
          </div>
          <button
            onClick={loadArticles}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? '🔄' : '↻'} Refresh
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Articles</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">🇺🇸 {stats.byLanguage.en}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">English</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">🇵🇱 {stats.byLanguage.pl}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Polish</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.byCategory.ai}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">AI</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.byCategory.apple}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Apple</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.byCategory.tech}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Tech</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.byStatus.admin}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Editable</div>
          </div>
        </div>


        {/* Column Visibility Toggle */}
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ⚙️ Configure Table Columns
          </summary>
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(visibleColumns).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className="rounded"
                  disabled={key === 'title'} // Title always visible
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {key === 'title' && '📝 Title'}
                  {key === 'category' && '📁 Category'}
                  {key === 'language' && '🌍 Language'}
                  {key === 'status' && '🔖 Type'}
                  {key === 'created' && '📅 Created'}
                  {key === 'author' && '✍️ Author'}
                  {key === 'views' && '👁️ Views'}
                  {key === 'lastEdit' && '🕐 Last Edit'}
                  {key === 'publishStatus' && '📤 Status'}
                </span>
              </label>
            ))}
          </div>
        </details>

        {/* Bulk Actions */}
        {selectedArticles.size > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-yellow-800 dark:text-yellow-200">
                <span className="font-medium">{selectedArticles.size} articles selected</span>
                <span className="text-sm ml-2">
                  ({filteredArticles.filter(a => selectedArticles.has(a.id) && a.status === 'admin').length} can be deleted)
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedArticles(new Set())}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={filteredArticles.filter(a => selectedArticles.has(a.id) && a.status === 'admin').length === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  🗑️ Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Articles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center justify-between">
            <span>📋 Articles ({filteredArticles.length})</span>
            {filteredArticles.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedArticles.size === filteredArticles.length && filteredArticles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select All
              </label>
            )}
          </h4>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select</th>
                {visibleColumns.title && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>}
                {visibleColumns.category && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>}
                {visibleColumns.language && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Language</th>}
                {visibleColumns.author && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Author</th>}
                {visibleColumns.status && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>}
                {visibleColumns.publishStatus && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>}
                {visibleColumns.views && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>}
                {visibleColumns.created && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>}
                {visibleColumns.lastEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Edit</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={() => handleSelectArticle(article.id)}
                      className="rounded"
                      disabled={article.status === 'static'}
                    />
                  </td>
                  {visibleColumns.title && (
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {article.image && (
                          <img
                            src={article.image}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white" title={article.title}>
                            {article.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {article.excerpt.substring(0, 100)}...
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Slug: {article.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.category && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm">
                        {getCategoryIcon(article.category)}
                        {article.category}
                      </span>
                    </td>
                  )}
                  {visibleColumns.language && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm">
                        {getLanguageFlag(article.language)}
                        {article.language.toUpperCase()}
                      </span>
                    </td>
                  )}
                  {visibleColumns.author && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <span>✍️</span>
                        <span>{article.author || 'Unknown'}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                        {article.status === 'static' && '🔒 Static'}
                        {article.status === 'admin' && '✏️ Editable'}
                        {article.status === 'dynamic' && '🔄 Dynamic'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.publishStatus && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        article.publishStatus === 'published' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      }`}>
                        {article.publishStatus === 'published' ? '✅ Published' : '📝 Draft'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.views && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span className="font-medium">{article.views?.toLocaleString() || 0}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.created && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(article.createdAt)}
                    </td>
                  )}
                  {visibleColumns.lastEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {article.lastEdit ? formatDate(article.lastEdit) : 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded-lg font-medium transition-colors"
                      >
                        🔗 View
                      </a>
                      {article.status === 'admin' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete article "${article.title}"?\n\nThis action cannot be undone!`)) {
                              localArticleStorage.deleteArticle(article.id);
                              loadArticles();
                              adminLogger.info('user', 'delete_single_article', `Deleted article: ${article.title}`);
                            }
                          }}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg font-medium transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {filteredArticles.map((article) => (
            <MobileArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticles.has(article.id)}
              onSelect={handleSelectArticle}
              onEdit={(article) => {
                // In future, navigate to editor with article data
                alert(`Edit feature coming soon!\nArticle: ${article.title}`);
              }}
              onDelete={(id) => {
                if (article.status === 'admin') {
                  localArticleStorage.deleteArticle(id);
                  loadArticles();
                  adminLogger.info('user', 'delete_single_article', `Deleted article: ${article.title}`);
                } else {
                  alert('Only admin-created articles can be deleted.');
                }
              }}
              onView={(url) => window.open(url, '_blank')}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No articles found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filters.search || filters.language !== 'all' || filters.category !== 'all' 
                ? 'Try adjusting your filters to see more articles.'
                : 'Create your first article using the URL Parser or Text Input.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          ℹ️ Article Management Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <div className="font-medium mb-2">Article Types:</div>
            <ul className="space-y-1">
              <li>• <strong>🔒 Static:</strong> Built-in articles (cannot be deleted)</li>
              <li>• <strong>✏️ Admin Created:</strong> Articles created through admin panel</li>
              <li>• <strong>🔄 Dynamic:</strong> Articles loaded from external sources</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Bulk Operations:</div>
            <ul className="space-y-1">
              <li>• Select multiple articles using checkboxes</li>
              <li>• Only admin-created articles can be deleted</li>
              <li>• Static articles are protected from deletion</li>
              <li>• Use search and filters to find specific articles</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
