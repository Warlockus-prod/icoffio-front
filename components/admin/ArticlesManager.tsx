'use client';

import { useEffect, useMemo, useState } from 'react';
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
  source?: string;
  createdAt: string;
  status: 'static' | 'dynamic' | 'admin';
  url: string;
  excerpt: string;
  image?: string;
  author?: string;
  views?: number;
  lastEdit?: string;
  publishStatus?: 'draft' | 'published';
  isFallbackImage?: boolean;
}

type SortDirection = 'asc' | 'desc';
type SortColumn =
  | 'title'
  | 'category'
  | 'language'
  | 'author'
  | 'source'
  | 'status'
  | 'publishStatus'
  | 'views'
  | 'createdAt'
  | 'lastEdit';

interface TableColumnFilters {
  title: string;
  category: string;
  language: string;
  author: string;
  source: string;
  type: string;
}

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800';
const DEFAULT_IMAGE_MARKER = 'photo-1485827404703-89b55fcc595e';
const TABLE_SETTINGS_STORAGE_KEY = 'icoffio_admin_articles_table_settings_v1';
const SORTABLE_COLUMNS: SortColumn[] = [
  'title',
  'category',
  'language',
  'author',
  'source',
  'status',
  'publishStatus',
  'views',
  'createdAt',
  'lastEdit',
];
const DEFAULT_TABLE_COLUMN_FILTERS: TableColumnFilters = {
  title: '',
  category: 'all',
  language: 'all',
  author: '',
  source: 'all',
  type: 'all',
};
const DEFAULT_VISIBLE_COLUMNS = {
  title: true,
  category: true,
  language: true,
  status: true,
  created: true,
  author: true,
  source: true,
  views: true,
  lastEdit: true,
  publishStatus: true,
};
const ESSENTIAL_VISIBLE_COLUMNS = {
  title: true,
  category: true,
  language: true,
  status: true,
  created: true,
  author: false,
  source: true,
  views: false,
  lastEdit: false,
  publishStatus: true,
};
const PLACEHOLDER_IMAGE_MARKERS = [
  DEFAULT_IMAGE_MARKER,
  'photo-1518770660439-4636190af475',
  'photo-1518709268805-4e9042af2176'
];

const isLikelyTemporaryImage = (image?: string): boolean =>
  Boolean(image && /oaidalleapiprod|[?&](st|se|sp|sig)=/i.test(image));

const isKnownPlaceholderImage = (image?: string): boolean =>
  Boolean(image && PLACEHOLDER_IMAGE_MARKERS.some((marker) => image.includes(marker)));

const hasCustomPersistentImage = (image?: string): boolean =>
  Boolean(image && !isKnownPlaceholderImage(image) && !isLikelyTemporaryImage(image));

const normalizeArticleImage = (image?: string): string =>
  image && image.trim() ? image : '';

const getCanonicalSlugKey = (slug: string, language: string): string => {
  const normalized = slug.trim().toLowerCase();
  const match = normalized.match(/^(.*?)-(en|pl)(?:-\d+)?$/);
  if (match) {
    return `${match[1]}::${match[2]}`;
  }

  const lang = language === 'pl' ? 'pl' : 'en';
  return `${normalized.replace(/-\d+$/, '')}::${lang}`;
};

const getSourceGroup = (source?: string): 'telegram' | 'admin' | 'static' | 'supabase' | 'other' => {
  if (!source) return 'other';
  if (source.startsWith('telegram')) return 'telegram';
  if (source.includes('admin')) return 'admin';
  if (source.includes('static')) return 'static';
  if (
    source.includes('supabase') ||
    source.includes('url-parse') ||
    source.includes('text-generate') ||
    source.includes('api')
  ) {
    return 'supabase';
  }
  return 'other';
};

const normalizeViews = (...values: unknown[]): number => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return 0;
};

export default function ArticlesManager() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: 'all',
    status: 'all',
    language: 'all',
    source: 'all',
    publishStatus: 'all',
    imageQuality: 'all',
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
    byStatus: { static: 0, dynamic: 0, admin: 0 },
    bySource: { telegram: 0, admin: 0, supabase: 0, other: 0 },
    byImage: { custom: 0, fallback: 0 }
  });
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [tableColumnFilters, setTableColumnFilters] = useState<TableColumnFilters>(DEFAULT_TABLE_COLUMN_FILTERS);
  const [sortBy, setSortBy] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            const imageUrl = normalizeArticleImage(article.image_url || article.image);
            const fallbackImage = !hasCustomPersistentImage(imageUrl);
            const viewCount = normalizeViews(article.views, article.total_views, article.unique_views);

            // English version
            if (article.slug_en) {
              allArticles.push({
                id: `supabase_${article.id}_en`,
                title: article.title_en || article.title,
                slug: article.slug_en,
                category: article.category || 'tech',
                language: 'en',
                source: article.source || 'supabase',
                createdAt: article.created_at,
                status: 'dynamic' as const,
                url: `https://www.icoffio.com/en/article/${article.slug_en}`,
                excerpt: article.excerpt_en || article.excerpt || '',
                image: imageUrl,
                isFallbackImage: fallbackImage,
                author: article.author || 'icoffio Editorial Team',
                views: viewCount,
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
                source: article.source || 'supabase',
                createdAt: article.created_at,
                status: 'dynamic' as const,
                url: `https://www.icoffio.com/pl/article/${article.slug_pl}`,
                excerpt: article.excerpt_pl || article.excerpt || '',
                image: imageUrl,
                isFallbackImage: fallbackImage,
                author: article.author || 'icoffio Editorial Team',
                views: viewCount,
                lastEdit: article.updated_at || article.created_at,
                publishStatus: 'published' as const
              });
            }

            // Backward compatibility: transformed single-language format
            if (!article.slug_en && !article.slug_pl && article.slug) {
              const inferredLanguage =
                article.language ||
                (article.slug.endsWith('-pl') ? 'pl' : 'en');

              allArticles.push({
                id: `supabase_${article.id}_${inferredLanguage}`,
                title: article.title || 'Untitled',
                slug: article.slug,
                category: article.category?.slug || article.category || 'tech',
                language: inferredLanguage,
                source: article.source || 'supabase',
                createdAt: article.date || article.created_at || new Date().toISOString(),
                status: 'dynamic' as const,
                url: `https://www.icoffio.com/${inferredLanguage}/article/${article.slug}`,
                excerpt: article.excerpt || '',
                image: imageUrl,
                isFallbackImage: fallbackImage,
                author: article.author || 'icoffio Editorial Team',
                views: viewCount,
                lastEdit: article.updated_at || article.date || article.created_at,
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
                        article.slug.endsWith('-pl') ? 'pl' : 'en';
        const imageUrl = normalizeArticleImage(article.image);
        
        allArticles.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
          category: article.category,
          language,
          source: 'admin-local',
          createdAt: article.createdAt,
          status: 'admin',
          url: `https://www.icoffio.com/${language}/article/${article.slug}`,
          excerpt: article.excerpt,
          image: imageUrl,
          isFallbackImage: !hasCustomPersistentImage(imageUrl),
          author: article.author || 'icoffio Editorial Team',
          views: normalizeViews((article as any).views, (article as any).total_views),
          lastEdit: article.updatedAt || article.createdAt,
          publishStatus: 'draft' as const
        });
      });
      
      // 3. Статические статьи
      const staticArticles = await getLocalArticles();
      staticArticles.forEach((article: Post) => {
        const language = article.slug.endsWith('-en') ? 'en' : 
                        article.slug.endsWith('-pl') ? 'pl' : 'en';
        const imageUrl = normalizeArticleImage(article.image);
        
        allArticles.push({
          id: `static_${article.slug}`,
          title: article.title,
          slug: article.slug,
          category: typeof article.category === 'string' ? article.category : article.category.slug,
          language,
          source: 'static-local',
          author: 'icoffio Editorial Team',
          views: normalizeViews((article as any).views, (article as any).total_views),
          lastEdit: article.publishedAt || article.date || new Date().toISOString(),
          publishStatus: 'published' as const,
          createdAt: article.publishedAt || article.date || new Date().toISOString(),
          status: 'static',
          url: `https://www.icoffio.com/${language}/article/${article.slug}`,
          excerpt: article.excerpt,
          image: imageUrl,
          isFallbackImage: !hasCustomPersistentImage(imageUrl)
        });
      });
      
      // Убираем дубликаты по каноническому slug + language.
      // Это склеивает варианты вроде slug-en / slug-en-1 / slug-en-2.
      const getTimestamp = (article: ArticleItem) =>
        new Date(article.lastEdit || article.createdAt).getTime() || 0;

      const getArticleScore = (article: ArticleItem): number => {
        let score = 0;
        if (!article.isFallbackImage) score += 100;
        if (article.publishStatus === 'published') score += 20;
        if (article.status === 'dynamic') score += 10;
        if (article.status === 'admin') score += 6;
        score += Math.min(article.views || 0, 5000) / 500;
        return score;
      };

      const bestBySlug = new Map<string, ArticleItem>();
      allArticles.forEach(article => {
        const slugKey = getCanonicalSlugKey(article.slug, article.language);
        const current = bestBySlug.get(slugKey);
        if (!current) {
          bestBySlug.set(slugKey, article);
          return;
        }

        const currentScore = getArticleScore(current);
        const candidateScore = getArticleScore(article);

        if (candidateScore > currentScore) {
          bestBySlug.set(slugKey, article);
          return;
        }

        if (candidateScore === currentScore && getTimestamp(article) > getTimestamp(current)) {
          bestBySlug.set(slugKey, article);
        }
      });

      const uniqueArticles = Array.from(bestBySlug.values());
      
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
      byStatus: { static: 0, dynamic: 0, admin: 0 },
      bySource: { telegram: 0, admin: 0, supabase: 0, other: 0 },
      byImage: { custom: 0, fallback: 0 }
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

      const sourceGroup = getSourceGroup(article.source);
      if (sourceGroup === 'telegram') stats.bySource.telegram++;
      else if (sourceGroup === 'admin') stats.bySource.admin++;
      else if (sourceGroup === 'supabase') stats.bySource.supabase++;
      else stats.bySource.other++;

      if (article.isFallbackImage) stats.byImage.fallback++;
      else stats.byImage.custom++;
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

    // Source filter
    if (filters.source !== 'all') {
      const sourceGroup = getSourceGroup(article.source);
      if (sourceGroup !== filters.source) return false;
    }

    // Publish status filter
    if (filters.publishStatus !== 'all') {
      if ((article.publishStatus || 'draft') !== filters.publishStatus) return false;
    }

    // Image quality filter
    if (filters.imageQuality === 'custom' && article.isFallbackImage) return false;
    if (filters.imageQuality === 'fallback' && !article.isFallbackImage) return false;
    
    // Search filter (title, content, author)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = article.title.toLowerCase().includes(searchLower);
      const matchesExcerpt = article.excerpt.toLowerCase().includes(searchLower);
      const matchesAuthor = article.author?.toLowerCase().includes(searchLower);
      const matchesSource = article.source?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesExcerpt && !matchesAuthor && !matchesSource) return false;
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
    const articleViews = article.views || 0;
    if (filters.viewsMin) {
      if (articleViews < parseInt(filters.viewsMin)) return false;
    }
    if (filters.viewsMax) {
      if (articleViews > parseInt(filters.viewsMax)) return false;
    }
    
    return true;
  });

  const hasTableColumnFilters = Object.values(tableColumnFilters).some(
    (value) => value !== '' && value !== 'all'
  );

  const displayedArticles = useMemo(() => {
    const withColumnFilters = filteredArticles.filter((article) => {
      if (tableColumnFilters.title) {
        if (!article.title.toLowerCase().includes(tableColumnFilters.title.toLowerCase())) {
          return false;
        }
      }

      if (tableColumnFilters.category !== 'all' && article.category !== tableColumnFilters.category) {
        return false;
      }

      if (tableColumnFilters.language !== 'all' && article.language !== tableColumnFilters.language) {
        return false;
      }

      if (tableColumnFilters.author) {
        if (!article.author?.toLowerCase().includes(tableColumnFilters.author.toLowerCase())) {
          return false;
        }
      }

      if (tableColumnFilters.source !== 'all') {
        const sourceGroup = getSourceGroup(article.source);
        if (sourceGroup !== tableColumnFilters.source) {
          return false;
        }
      }

      if (tableColumnFilters.type !== 'all' && article.status !== tableColumnFilters.type) {
        return false;
      }

      return true;
    });

    const sorted = [...withColumnFilters].sort((a, b) => {
      const sourceA = getSourceGroup(a.source);
      const sourceB = getSourceGroup(b.source);
      const aValue = (() => {
        if (sortBy === 'title') return a.title.toLowerCase();
        if (sortBy === 'category') return a.category.toLowerCase();
        if (sortBy === 'language') return a.language.toLowerCase();
        if (sortBy === 'author') return (a.author || '').toLowerCase();
        if (sortBy === 'source') return sourceA;
        if (sortBy === 'status') return a.status;
        if (sortBy === 'publishStatus') return a.publishStatus || 'draft';
        if (sortBy === 'views') return a.views || 0;
        if (sortBy === 'lastEdit') return new Date(a.lastEdit || a.createdAt).getTime() || 0;
        return new Date(a.createdAt).getTime() || 0;
      })();
      const bValue = (() => {
        if (sortBy === 'title') return b.title.toLowerCase();
        if (sortBy === 'category') return b.category.toLowerCase();
        if (sortBy === 'language') return b.language.toLowerCase();
        if (sortBy === 'author') return (b.author || '').toLowerCase();
        if (sortBy === 'source') return sourceB;
        if (sortBy === 'status') return b.status;
        if (sortBy === 'publishStatus') return b.publishStatus || 'draft';
        if (sortBy === 'views') return b.views || 0;
        if (sortBy === 'lastEdit') return new Date(b.lastEdit || b.createdAt).getTime() || 0;
        return new Date(b.createdAt).getTime() || 0;
      })();

      let result = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), 'en', { sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredArticles, sortBy, sortDirection, tableColumnFilters]);

  const selectedItems = useMemo(
    () => articles.filter((article) => selectedArticles.has(article.id)),
    [articles, selectedArticles]
  );
  const selectedVisibleCount = useMemo(
    () => displayedArticles.filter((article) => selectedArticles.has(article.id)).length,
    [displayedArticles, selectedArticles]
  );
  const selectedDeletableCount = useMemo(
    () => selectedItems.filter((article) => article.status !== 'static').length,
    [selectedItems]
  );

  const handleSortToggle = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    if (column === 'views' || column === 'createdAt' || column === 'lastEdit') {
      setSortDirection('desc');
    } else {
      setSortDirection('asc');
    }
  };

  const getSortMarker = (column: SortColumn): string => {
    if (sortBy !== column) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Обработка чекбоксов
  const handleSelectAll = () => {
    if (displayedArticles.length === 0) {
      return;
    }

    if (selectedVisibleCount === displayedArticles.length) {
      const next = new Set(selectedArticles);
      displayedArticles.forEach((article) => next.delete(article.id));
      setSelectedArticles(next);
    } else {
      const next = new Set(selectedArticles);
      displayedArticles.forEach((article) => next.add(article.id));
      setSelectedArticles(next);
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

  const deleteDynamicBySlugs = async (slugs: string[]): Promise<number> => {
    if (slugs.length === 0) return 0;

    const response = await fetch('/api/admin/bulk-delete-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Failed to delete dynamic articles');
    }

    return Number(result?.deleted || 0);
  };

  const deleteOneDynamicBySlug = async (slug: string): Promise<void> => {
    const response = await fetch('/api/admin/delete-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Failed to delete article');
    }
  };

  // Массовое удаление
  const handleBulkDelete = async () => {
    const selectedCount = selectedArticles.size;
    const articlesToDelete = articles.filter(a => selectedArticles.has(a.id));
    const staticCount = articlesToDelete.filter(a => a.status === 'static').length;
    
    if (staticCount > 0) {
      alert(`⚠️ Cannot delete static articles!\n\n${staticCount} of selected articles are static and cannot be deleted.\nOnly dynamic/admin articles can be deleted.`);
      return;
    }

    if (!window.confirm(`🗑️ Delete ${selectedCount} selected articles?\n\nThis action cannot be undone!\n\nContinue?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const dynamicSlugs = articlesToDelete
        .filter(a => a.status === 'dynamic')
        .map(a => a.slug);

      const adminArticles = localArticleStorage.getAllArticles();
      const adminIds = articlesToDelete
        .filter(a => a.status === 'admin')
        .map(a => a.id);

      const dynamicDeleted = await deleteDynamicBySlugs(dynamicSlugs);

      let adminDeleted = 0;
      if (adminIds.length > 0) {
        const remaining = adminArticles.filter(article => !adminIds.includes(article.id));
        localStorage.setItem('icoffio_admin_articles', JSON.stringify(remaining));
        adminDeleted = adminIds.length;
      }

      const totalDeleted = dynamicDeleted + adminDeleted;
      adminLogger.info('user', 'bulk_delete_articles', `Bulk deleted ${selectedCount} articles`, { 
        deletedDynamicSlugs: dynamicSlugs,
        deletedIds: adminIds,
        requestedCount: selectedCount,
        deletedCount: totalDeleted
      });
      
      alert(`✅ Successfully deleted ${totalDeleted} articles!`);
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
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(TABLE_SETTINGS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        density?: 'compact' | 'comfortable';
        visibleColumns?: typeof visibleColumns;
        sortBy?: SortColumn;
        sortDirection?: SortDirection;
      };

      if (parsed.density === 'compact' || parsed.density === 'comfortable') {
        setDensity(parsed.density);
      }
      if (parsed.visibleColumns) {
        setVisibleColumns((prev) => ({ ...prev, ...parsed.visibleColumns, title: true }));
      }
      if (parsed.sortBy && SORTABLE_COLUMNS.includes(parsed.sortBy)) {
        setSortBy(parsed.sortBy);
      }
      if (parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc') {
        setSortDirection(parsed.sortDirection);
      }
    } catch (error) {
      console.warn('Failed to load table settings:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      TABLE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ density, visibleColumns, sortBy, sortDirection })
    );
  }, [density, visibleColumns, sortBy, sortDirection]);

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

  const getSourceLabel = (source?: string) => {
    const sourceGroup = getSourceGroup(source);
    if (sourceGroup === 'telegram') return '📱 Telegram';
    if (sourceGroup === 'admin') return '👤 Admin';
    if (sourceGroup === 'static') return '🔒 Static';
    if (sourceGroup === 'supabase') return '🗄️ Supabase';
    return source || 'unknown';
  };

  const getSourceColor = (source?: string) => {
    const sourceGroup = getSourceGroup(source);
    if (sourceGroup === 'telegram') return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
    if (sourceGroup === 'admin') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
    if (sourceGroup === 'static') return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
    if (sourceGroup === 'supabase') return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400';
    return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
  };

  const escapeCsvValue = (value: string | number | null | undefined): string => {
    const stringValue = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportCsv = () => {
    if (displayedArticles.length === 0) {
      alert('No rows to export.');
      return;
    }

    const headers = [
      'title',
      'slug',
      'category',
      'language',
      'author',
      'source',
      'type',
      'publish_status',
      'views',
      'created_at',
      'last_edit',
      'image_quality',
      'url'
    ];

    const rows = displayedArticles.map((article) => [
      article.title,
      article.slug,
      article.category,
      article.language,
      article.author || '',
      getSourceGroup(article.source),
      article.status,
      article.publishStatus || 'draft',
      article.views || 0,
      article.createdAt,
      article.lastEdit || '',
      article.isFallbackImage ? 'fallback_or_temporary' : 'custom',
      article.url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);

    link.setAttribute('href', url);
    link.setAttribute('download', `articles-export-${date}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          source: 'all',
          publishStatus: 'all',
          imageQuality: 'all',
          dateFrom: '',
          dateTo: '',
          author: '',
          viewsMin: '',
          viewsMax: ''
        })}
        totalResults={articles.length}
        filteredResults={displayedArticles.length}
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              title="Table density"
            >
              <option value="compact">Compact Rows</option>
              <option value="comfortable">Comfortable Rows</option>
            </select>

            <button
              onClick={handleExportCsv}
              disabled={displayedArticles.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              ⬇️ Export CSV
            </button>

            <button
              onClick={loadArticles}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-4 mb-6">
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
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.bySource.telegram}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Telegram</div>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.bySource.supabase}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Supabase/API</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.byImage.custom}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Real Images</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.byImage.fallback}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Placeholder</div>
          </div>
        </div>


        {/* Column Visibility Toggle */}
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ⚙️ Configure Table Columns
          </summary>
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS })}
                className="px-3 py-1 text-xs rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Show All Columns
              </button>
              <button
                onClick={() => setVisibleColumns({ ...ESSENTIAL_VISIBLE_COLUMNS })}
                className="px-3 py-1 text-xs rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Essential Set
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Visible: {Object.values(visibleColumns).filter(Boolean).length}/{Object.keys(visibleColumns).length}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  {key === 'source' && '📌 Source'}
                  {key === 'views' && '👁️ Views'}
                  {key === 'lastEdit' && '🕐 Last Edit'}
                  {key === 'publishStatus' && '📤 Status'}
                </span>
              </label>
            ))}
            </div>
          </div>
        </details>

        {/* Bulk Actions */}
        {selectedArticles.size > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-yellow-800 dark:text-yellow-200">
                <span className="font-medium">{selectedArticles.size} articles selected</span>
                <span className="text-sm ml-2">
                  ({selectedDeletableCount} deletable, {selectedVisibleCount} visible in current view)
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
                  disabled={selectedDeletableCount === 0}
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
            <span>📋 Articles ({displayedArticles.length})</span>
            {displayedArticles.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedVisibleCount === displayedArticles.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select All (visible)
              </label>
            )}
          </h4>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <input
              type="text"
              value={tableColumnFilters.title}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Filter title..."
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={tableColumnFilters.category}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All categories</option>
              <option value="ai">AI</option>
              <option value="apple">Apple</option>
              <option value="tech">Tech</option>
              <option value="games">Games</option>
              <option value="digital">Digital</option>
            </select>
            <select
              value={tableColumnFilters.language}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, language: event.target.value }))
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All languages</option>
              <option value="en">English</option>
              <option value="pl">Polish</option>
            </select>
            <input
              type="text"
              value={tableColumnFilters.author}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, author: event.target.value }))
              }
              placeholder="Filter author..."
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={tableColumnFilters.source}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, source: event.target.value }))
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All sources</option>
              <option value="telegram">Telegram</option>
              <option value="admin">Admin</option>
              <option value="static">Static</option>
              <option value="supabase">Supabase</option>
              <option value="other">Other</option>
            </select>
            <select
              value={tableColumnFilters.type}
              onChange={(event) =>
                setTableColumnFilters((prev) => ({ ...prev, type: event.target.value }))
              }
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All types</option>
              <option value="admin">Admin</option>
              <option value="dynamic">Dynamic</option>
              <option value="static">Static</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortColumn)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="createdAt">Sort: Created</option>
              <option value="title">Sort: Title</option>
              <option value="category">Sort: Category</option>
              <option value="language">Sort: Language</option>
              <option value="author">Sort: Author</option>
              <option value="source">Sort: Source</option>
              <option value="status">Sort: Type</option>
              <option value="publishStatus">Sort: Status</option>
              <option value="views">Sort: Views</option>
              <option value="lastEdit">Sort: Last Edit</option>
            </select>
            <div className="flex gap-2">
              <select
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <button
                onClick={() => setTableColumnFilters({ ...DEFAULT_TABLE_COLUMN_FILTERS })}
                className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
          {hasTableColumnFilters && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Quick table filters are active. They are applied on top of Advanced Search.
            </p>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block max-h-[72vh] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select</th>
                {visibleColumns.title && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('title')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Title <span>{getSortMarker('title')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.category && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('category')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Category <span>{getSortMarker('category')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.language && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('language')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Language <span>{getSortMarker('language')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.author && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('author')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Author <span>{getSortMarker('author')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.source && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('source')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Source <span>{getSortMarker('source')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('status')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Type <span>{getSortMarker('status')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.publishStatus && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('publishStatus')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Status <span>{getSortMarker('publishStatus')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.views && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('views')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Views <span>{getSortMarker('views')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.created && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('createdAt')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Created <span>{getSortMarker('createdAt')}</span>
                    </button>
                  </th>
                )}
                {visibleColumns.lastEdit && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <button
                      onClick={() => handleSortToggle('lastEdit')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Last Edit <span>{getSortMarker('lastEdit')}</span>
                    </button>
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayedArticles.map((article) => (
                <tr
                  key={article.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    density === 'compact' ? 'align-top' : ''
                  }`}
                >
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
                        {!article.isFallbackImage && article.image ? (
                          <img
                            src={article.image || FALLBACK_IMAGE_URL}
                            alt=""
                            className={`${density === 'compact' ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg object-cover flex-shrink-0`}
                            onError={(event) => {
                              if (event.currentTarget.src !== FALLBACK_IMAGE_URL) {
                                event.currentTarget.src = FALLBACK_IMAGE_URL;
                              }
                            }}
                          />
                        ) : (
                          <div
                            className={`${density === 'compact' ? 'w-12 h-12 text-base' : 'w-16 h-16 text-lg'} rounded-lg flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200 dark:border-orange-800`}
                            title="Placeholder image or temporary image"
                          >
                            ⚠️
                          </div>
                        )}
                        <div className="min-w-0 max-w-[440px]">
                          <div
                            className={`text-sm font-medium text-gray-900 dark:text-white ${density === 'compact' ? 'line-clamp-2' : 'line-clamp-3'}`}
                            title={article.title}
                          >
                            {article.title}
                          </div>
                          <div
                            className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'}`}
                            title={article.excerpt}
                          >
                            {article.excerpt || '—'}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate" title={article.slug}>
                            Slug: {article.slug}
                          </div>
                          {article.isFallbackImage && (
                            <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-1">
                              Placeholder image detected
                            </div>
                          )}
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
                  {visibleColumns.source && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(article.source)}`}>
                        {getSourceLabel(article.source)}
                      </span>
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
                      {article.status !== 'static' && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete article "${article.title}"?\n\nThis action cannot be undone!`)) {
                              try {
                                if (article.status === 'admin') {
                                  localArticleStorage.deleteArticle(article.id);
                                } else {
                                  await deleteOneDynamicBySlug(article.slug);
                                }
                                loadArticles();
                                adminLogger.info('user', 'delete_single_article', `Deleted article: ${article.title}`);
                              } catch (error) {
                                console.error('Single delete failed:', error);
                                alert('❌ Failed to delete article. Please try again.');
                              }
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
          {displayedArticles.map((article) => (
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
                if (article.status === 'static') {
                  alert('Static articles cannot be deleted.');
                  return;
                }

                const runDelete = async () => {
                  try {
                    if (article.status === 'admin') {
                      localArticleStorage.deleteArticle(id);
                    } else {
                      await deleteOneDynamicBySlug(article.slug);
                    }
                    loadArticles();
                    adminLogger.info('user', 'delete_single_article', `Deleted article: ${article.title}`);
                  } catch (error) {
                    console.error('Mobile single delete failed:', error);
                    alert('❌ Failed to delete article. Please try again.');
                  }
                };

                void runDelete();
              }}
              onView={(url) => window.open(url, '_blank')}
            />
          ))}
        </div>

        {/* Empty State */}
        {displayedArticles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No articles found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filters.search ||
              filters.language !== 'all' ||
              filters.category !== 'all' ||
              filters.status !== 'all' ||
              filters.source !== 'all' ||
              filters.publishStatus !== 'all' ||
              filters.imageQuality !== 'all' ||
              filters.author ||
              filters.dateFrom ||
              filters.dateTo ||
              filters.viewsMin ||
              filters.viewsMax ||
              hasTableColumnFilters
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
              <li>• Dynamic and admin articles can be deleted</li>
              <li>• Static articles are protected from deletion</li>
              <li>• Use search and filters to find specific articles</li>
              <li>• Export current filtered view to CSV</li>
              <li>• Filter "Image Quality" to isolate placeholder images</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
