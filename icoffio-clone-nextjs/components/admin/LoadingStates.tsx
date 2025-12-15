'use client';

/**
 * Loading States & Skeleton Loaders
 * 
 * Красивые skeleton loaders для админ-панели
 * Используются во время загрузки данных для улучшения UX
 * 
 * Компоненты:
 * - ArticleCardSkeleton - для списка статей
 * - TableRowSkeleton - для таблиц
 * - EditorSkeleton - для редактора
 * - StatsSkeleton - для статистики
 */

// Базовый skeleton компонент
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// Skeleton для карточки статьи
export const ArticleCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-start gap-4">
      {/* Checkbox */}
      <Skeleton className="w-4 h-4 mt-1" />
      
      <div className="flex-1 space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Excerpt */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        
        {/* Meta */}
        <div className="flex items-center gap-4 mt-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  </div>
);

// Skeleton для строки таблицы
export const TableRowSkeleton = () => (
  <tr className="border-b border-gray-200 dark:border-gray-700">
    <td className="p-4">
      <Skeleton className="w-4 h-4" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-48" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-24" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-20" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-32" />
    </td>
    <td className="p-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </td>
  </tr>
);

// Skeleton для редактора
export const EditorSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
    {/* Header */}
    <div className="p-6 border-b border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
    
    {/* Content */}
    <div className="p-6 space-y-6">
      {/* Title */}
      <div>
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
      
      {/* Category & Author */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      {/* Excerpt */}
      <div>
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
      
      {/* Content */}
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

// Skeleton для статистики
export const StatsSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <Skeleton className="h-6 w-16" />
    </div>
    <Skeleton className="h-8 w-20 mb-1" />
    <Skeleton className="h-4 w-32" />
  </div>
);

// Skeleton для Dashboard
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Welcome */}
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <Skeleton className="h-6 w-64 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsSkeleton />
      <StatsSkeleton />
      <StatsSkeleton />
      <StatsSkeleton />
    </div>
    
    {/* Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Skeleton className="w-8 h-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Skeleton для списка статей
export const ArticlesListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <ArticleCardSkeleton key={i} />
    ))}
  </div>
);

// Inline loading spinner
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };
  
  return (
    <div className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`} />
  );
};

// Full page loading
export const FullPageLoading = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Loading overlay
export const LoadingOverlay = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-900 dark:text-white font-medium">{message}</p>
    </div>
  </div>
);













