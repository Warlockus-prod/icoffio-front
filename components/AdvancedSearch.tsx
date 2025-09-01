'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/lib/i18n';
import type { Post, Category } from '@/lib/types';
import { OptimizedImage } from './OptimizedImage';

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

interface SearchFilters {
  query: string;
  category: string;
  dateRange: 'all' | 'week' | 'month' | '3months' | 'year';
  sortBy: 'date' | 'relevance';
}

interface SearchResult extends Post {
  score?: number;
}

export function AdvancedSearch({ isOpen, onClose, locale }: AdvancedSearchProps) {
  const router = useRouter();
  const t = getTranslation(locale);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    dateRange: 'all',
    sortBy: 'relevance'
  });
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Моковые данные для демонстрации (в реальном проекте будет API)
  const mockPosts: Post[] = useMemo(() => [
    {
      slug: 'ai-breakthrough-gpt5',
      title: 'AI Breakthrough: GPT-5 and the Future of Multimodal Intelligence',
      excerpt: 'The next generation of AI models promises unprecedented understanding across text, images, audio, and video.',
      date: '2025-01-13T00:00:00Z',
      publishedAt: '2025-01-13T00:00:00Z',
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=400&auto=format&fit=crop',
      category: { name: 'AI', slug: 'ai' },
      contentHtml: ''
    },
    {
      slug: 'apple-vision-pro-2024',
      title: 'Apple Vision Pro 2024: Revolutionizing Spatial Computing',
      excerpt: 'Apple\'s groundbreaking mixed reality headset is transforming how we interact with digital content.',
      date: '2025-01-13T00:00:00Z',
      publishedAt: '2025-01-13T00:00:00Z',
      image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=400&auto=format&fit=crop',
      category: { name: 'Apple', slug: 'apple' },
      contentHtml: ''
    },
    {
      slug: 'quantum-computing-breakthrough',
      title: 'Quantum Computing Breakthrough: IBM\'s 1000+ Qubit Processor',
      excerpt: 'IBM achieves a major milestone in quantum computing with their latest 1000+ qubit processor.',
      date: '2025-01-12T00:00:00Z',
      publishedAt: '2025-01-12T00:00:00Z',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
      category: { name: 'Tech', slug: 'tech' },
      contentHtml: ''
    },
    {
      slug: 'metaverse-evolution',
      title: 'The Metaverse Evolution: Beyond Virtual Reality',
      excerpt: 'From gaming worlds to digital workspaces, the metaverse is reshaping human interaction.',
      date: '2025-01-12T00:00:00Z',
      publishedAt: '2025-01-12T00:00:00Z',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?q=80&w=400&auto=format&fit=crop',
      category: { name: 'Digital', slug: 'digital' },
      contentHtml: ''
    }
  ], []);

  const mockCategories: Category[] = useMemo(() => [
    { name: 'AI', slug: 'ai' },
    { name: 'Apple', slug: 'apple' },
    { name: 'Digital', slug: 'digital' },
    { name: 'Tech', slug: 'tech' },
    { name: 'News', slug: 'news-2' }
  ], []);

  // Загрузка категорий
  useEffect(() => {
    setCategories(mockCategories);
  }, [mockCategories]);

  // Функция поиска с фильтрами
  const performSearch = useCallback(async () => {
    if (!filters.query && filters.category === 'all' && filters.dateRange === 'all') {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredResults = [...mockPosts];

    // Фильтр по поисковому запросу
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredResults = filteredResults.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.category.name.toLowerCase().includes(query)
      ).map(post => ({
        ...post,
        score: calculateRelevanceScore(post, filters.query)
      }));
    }

    // Фильтр по категории
    if (filters.category !== 'all') {
      filteredResults = filteredResults.filter(post => 
        post.category.slug === filters.category
      );
    }

    // Фильтр по дате
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredResults = filteredResults.filter(post => 
        new Date(post.publishedAt) >= cutoffDate
      );
    }

    // Сортировка
    if (filters.sortBy === 'date') {
      filteredResults.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    } else if (filters.sortBy === 'relevance' && filters.query) {
      filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    setResults(filteredResults);
    setIsLoading(false);
  }, [filters, mockPosts]);

  // Функция расчета релевантности
  const calculateRelevanceScore = (post: Post, query: string): number => {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Совпадение в заголовке (больший вес)
    if (post.title.toLowerCase().includes(queryLower)) {
      score += 10;
      // Точное совпадение в заголовке
      if (post.title.toLowerCase() === queryLower) score += 20;
    }
    
    // Совпадение в описании
    if (post.excerpt.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Совпадение в категории
    if (post.category.name.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    
    return score;
  };

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [performSearch]);

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === 'en' ? 'en-US' : 'ru-RU', 
      { day: 'numeric', month: 'short', year: 'numeric' }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-full flex items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              🔍 {locale === 'en' ? 'Advanced Search' : 'Расширенный поиск'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Search Query */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'en' ? 'Search query' : 'Поисковый запрос'}
                </label>
                <input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  placeholder={locale === 'en' ? 'Search articles...' : 'Поиск статей...'}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'en' ? 'Category' : 'Категория'}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{locale === 'en' ? 'All categories' : 'Все категории'}</option>
                  {categories.map(category => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {locale === 'en' ? 'Date range' : 'Период'}
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as SearchFilters['dateRange'] }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{locale === 'en' ? 'All time' : 'Все время'}</option>
                  <option value="week">{locale === 'en' ? 'Last week' : 'Последняя неделя'}</option>
                  <option value="month">{locale === 'en' ? 'Last month' : 'Последний месяц'}</option>
                  <option value="3months">{locale === 'en' ? 'Last 3 months' : 'Последние 3 месяца'}</option>
                  <option value="year">{locale === 'en' ? 'Last year' : 'Последний год'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>{locale === 'en' ? 'Searching...' : 'Поиск...'}</span>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="p-6 space-y-4">
                {results.map((post) => (
                  <article
                    key={post.slug}
                    className="flex gap-4 p-4 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    onClick={() => {
                      router.push(`/${locale}/article/${post.slug}`);
                      onClose();
                    }}
                  >
                    <div className="flex-shrink-0 w-20 h-20">
                      <OptimizedImage
                        src={post.image || ''}
                        alt={post.title}
                        width={80}
                        height={80}
                        className="w-full h-full rounded-lg"
                        quality={60}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          {post.category.name}
                        </span>
                        <time>{formatDate(post.publishedAt)}</time>
                        {post.score && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {locale === 'en' ? 'Relevance' : 'Релевантность'}: {post.score}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-medium">
                  {locale === 'en' ? 'No results found' : 'Результаты не найдены'}
                </p>
                <p className="text-sm">
                  {locale === 'en' 
                    ? 'Try adjusting your search terms or filters' 
                    : 'Попробуйте изменить поисковый запрос или фильтры'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
