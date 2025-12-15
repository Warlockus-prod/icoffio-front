'use client';

import { useState } from 'react';

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

interface MobileArticleCardProps {
  article: ArticleItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (article: ArticleItem) => void;
  onDelete: (id: string) => void;
  onView: (url: string) => void;
}

export default function MobileArticleCard({
  article,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onView
}: MobileArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      'ai': '🤖',
      'apple': '🍎',
      'tech': '💻',
      'games': '🎮',
      'digital': '🌐'
    };
    return map[category.toLowerCase()] || '📄';
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'static': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'dynamic': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    };
    return map[status] || '';
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(article.id)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 touch-none"
          />

          {/* Image */}
          {article.image && (
            <img
              src={article.image}
              alt={article.title}
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}

          {/* Title & Category */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white text-base line-clamp-2 mb-1">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{getCategoryEmoji(article.category)}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {article.category}
              </span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {article.language.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
            {article.status}
          </span>
          {article.publishStatus && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                article.publishStatus === 'published'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}
            >
              📤 {article.publishStatus}
            </span>
          )}
        </div>

        {/* Excerpt (always visible) */}
        {article.excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {article.excerpt}
          </p>
        )}

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          {article.views !== undefined && (
            <div className="flex items-center gap-1">
              <span>👁️</span>
              <span>{article.views.toLocaleString()}</span>
            </div>
          )}
          {article.author && (
            <div className="flex items-center gap-1 truncate">
              <span>✍️</span>
              <span className="truncate">{article.author}</span>
            </div>
          )}
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1 py-2 min-h-[44px] touch-none"
        >
          {isExpanded ? '▲ Hide Details' : '▼ Show Details'}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(article.createdAt).toLocaleDateString()}
              </span>
            </div>
            {article.lastEdit && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Last Edit:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(article.lastEdit).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Slug:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs truncate max-w-[200px]">
                {article.slug}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onView(article.url)}
          className="px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700 text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px] touch-none"
        >
          <span>👁️</span>
          <span>View</span>
        </button>
        <button
          onClick={() => onEdit(article)}
          className="px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700 text-green-600 dark:text-green-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px] touch-none"
        >
          <span>✏️</span>
          <span>Edit</span>
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${article.title}"?`)) {
              onDelete(article.id);
            }
          }}
          className="px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700 text-red-600 dark:text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px] touch-none"
        >
          <span>🗑️</span>
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}













