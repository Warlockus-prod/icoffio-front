'use client';

import { useState, useEffect } from 'react';
import { localArticleStorage, type StoredArticle } from '@/lib/local-article-storage';
import { getLocalArticles } from '@/lib/local-articles';
import { adminLogger } from '@/lib/admin-logger';
import type { Post } from '@/lib/types';

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
}

export default function ArticlesManager() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    language: 'all',
    category: 'all',
    status: 'all',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    byLanguage: { en: 0, pl: 0 },
    byCategory: { ai: 0, apple: 0, tech: 0, games: 0, digital: 0 },
    byStatus: { static: 0, dynamic: 0, admin: 0 }
  });

  // Загрузка всех статей
  const loadArticles = async () => {
    setIsLoading(true);
    try {
      // Статьи из админ localStorage
      const adminArticles = localArticleStorage.getAllArticles();
      
      // Статические статьи
      const staticArticles = await getLocalArticles();
      
      const allArticles: ArticleItem[] = [];
      
      // Конвертируем админские статьи
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
          image: article.image
        });
      });
      
      // Конвертируем статические статьи
      staticArticles.forEach((article: Post) => {
        const language = article.slug.endsWith('-en') ? 'en' : 
                        article.slug.endsWith('-pl') ? 'pl' : 'unknown';
        
        allArticles.push({
          id: `static_${article.slug}`,
          title: article.title,
          slug: article.slug,
          category: typeof article.category === 'string' ? article.category : article.category.slug,
          language,
          createdAt: article.publishedAt,
          status: 'static',
          url: `https://app.icoffio.com/${language}/article/${article.slug}`,
          excerpt: article.excerpt,
          image: article.image
        });
      });
      
      // Убираем дубликаты по slug
      const uniqueArticles = allArticles.filter((article, index, self) => 
        index === self.findIndex(a => a.slug === article.slug)
      );
      
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

  // Фильтрация статей
  const filteredArticles = articles.filter(article => {
    if (filter.language !== 'all' && article.language !== filter.language) return false;
    if (filter.category !== 'all' && article.category !== filter.category) return false;
    if (filter.status !== 'all' && article.status !== filter.status) return false;
    if (filter.search && !article.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
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

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <select
            value={filter.language}
            onChange={(e) => setFilter(prev => ({ ...prev, language: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Languages</option>
            <option value="en">🇺🇸 English</option>
            <option value="pl">🇵🇱 Polish</option>
          </select>

          <select
            value={filter.category}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="ai">🤖 AI</option>
            <option value="apple">🍎 Apple</option>
            <option value="tech">⚙️ Tech</option>
            <option value="games">🎮 Games</option>
            <option value="digital">📱 Digital</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="admin">✏️ Admin Created</option>
            <option value="static">🔒 Static Articles</option>
          </select>

          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search articles..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
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
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm">
                      {getCategoryIcon(article.category)}
                      {article.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm">
                      {getLanguageFlag(article.language)}
                      {article.language.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                      {article.status === 'static' && '🔒 Static'}
                      {article.status === 'admin' && '✏️ Editable'}
                      {article.status === 'dynamic' && '🔄 Dynamic'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(article.createdAt)}
                  </td>
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

          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No articles found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter.search || filter.language !== 'all' || filter.category !== 'all' 
                  ? 'Try adjusting your filters to see more articles.'
                  : 'Create your first article using the URL Parser or Text Input.'
                }
              </p>
            </div>
          )}
        </div>
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
