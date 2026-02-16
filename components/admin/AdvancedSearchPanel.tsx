'use client';

import { useState } from 'react';

export interface SearchFilters {
  search: string;
  category: string;
  status: string;
  language: string;
  source: string;
  publishStatus: string;
  imageQuality: string;
  dateFrom: string;
  dateTo: string;
  author: string;
  viewsMin: string;
  viewsMax: string;
}

interface AdvancedSearchPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
  totalResults: number;
  filteredResults: number;
}

export default function AdvancedSearchPanel({
  filters,
  onFiltersChange,
  onReset,
  totalResults,
  filteredResults
}: AdvancedSearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value !== '' && value !== 'all'
  ).length;

  const hasFilters = activeFiltersCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🔍 Advanced Search
            {hasFilters && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                {activeFiltersCount} active
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredResults} of {totalResults} articles
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={onReset}
              className="px-3 py-2 min-h-[44px] md:min-h-[36px] text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1 touch-none"
            >
              🔄 Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 min-h-[44px] md:min-h-[36px] text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 touch-none"
          >
            {isExpanded ? '▲ Hide Filters' : '▼ Show Filters'}
          </button>
        </div>
      </div>

      {/* Basic Search (always visible) */}
      <div className="mb-4">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder="🔍 Search by title, content, or author..."
          className="w-full px-4 py-3 md:py-2 min-h-[48px] md:min-h-[40px] text-base md:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Advanced Filters (collapsible) */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
          {/* Row 1: Category, Status, Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="ai">🤖 AI</option>
                <option value="apple">🍎 Apple</option>
                <option value="tech">💻 Tech</option>
                <option value="games">🎮 Games</option>
                <option value="digital">🌐 Digital</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="admin">✏️ Admin Created</option>
                <option value="dynamic">🔄 Dynamic</option>
                <option value="static">🔒 Static Articles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages</option>
                <option value="en">🇺🇸 English</option>
                <option value="pl">🇵🇱 Polish</option>
              </select>
            </div>
          </div>

          {/* Row 2: Source, Publish status, Image quality */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="telegram">📱 Telegram</option>
                <option value="admin">👤 Admin</option>
                <option value="static">🔒 Static</option>
                <option value="supabase">🗄️ Supabase</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Publish Status
              </label>
              <select
                value={filters.publishStatus}
                onChange={(e) => handleChange('publishStatus', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Publish States</option>
                <option value="published">✅ Published</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image Quality
              </label>
              <select
                value={filters.imageQuality}
                onChange={(e) => handleChange('imageQuality', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Images</option>
                <option value="custom">🖼️ Real Images Only</option>
                <option value="fallback">⚠️ Placeholder/Temporary</option>
              </select>
            </div>
          </div>

          {/* Row 3: Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Author
            </label>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => handleChange('author', e.target.value)}
              placeholder="Filter by author name..."
              className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Row 5: Views Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Views
              </label>
              <input
                type="number"
                value={filters.viewsMin}
                onChange={(e) => handleChange('viewsMin', e.target.value)}
                placeholder="e.g. 100"
                min="0"
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Views
              </label>
              <input
                type="number"
                value={filters.viewsMax}
                onChange={(e) => handleChange('viewsMax', e.target.value)}
                placeholder="e.g. 10000"
                min="0"
                className="w-full px-3 py-2 min-h-[48px] md:min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active Filters Badges */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
              {filters.search && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                  Search: "{filters.search.substring(0, 20)}{filters.search.length > 20 ? '...' : ''}"
                  <button
                    onClick={() => handleChange('search', '')}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.category !== 'all' && filters.category && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                  Category: {filters.category}
                  <button
                    onClick={() => handleChange('category', 'all')}
                    className="hover:text-purple-900 dark:hover:text-purple-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.status !== 'all' && filters.status && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                  Type: {filters.status}
                  <button
                    onClick={() => handleChange('status', 'all')}
                    className="hover:text-green-900 dark:hover:text-green-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.language !== 'all' && filters.language && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-full flex items-center gap-1">
                  Language: {filters.language}
                  <button
                    onClick={() => handleChange('language', 'all')}
                    className="hover:text-yellow-900 dark:hover:text-yellow-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.source !== 'all' && filters.source && (
                <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs rounded-full flex items-center gap-1">
                  Source: {filters.source}
                  <button
                    onClick={() => handleChange('source', 'all')}
                    className="hover:text-violet-900 dark:hover:text-violet-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.publishStatus !== 'all' && filters.publishStatus && (
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full flex items-center gap-1">
                  Publish: {filters.publishStatus}
                  <button
                    onClick={() => handleChange('publishStatus', 'all')}
                    className="hover:text-emerald-900 dark:hover:text-emerald-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.imageQuality !== 'all' && filters.imageQuality && (
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded-full flex items-center gap-1">
                  Images: {filters.imageQuality}
                  <button
                    onClick={() => handleChange('imageQuality', 'all')}
                    className="hover:text-amber-900 dark:hover:text-amber-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.dateFrom && (
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 text-xs rounded-full flex items-center gap-1">
                  From: {new Date(filters.dateFrom).toLocaleDateString()}
                  <button
                    onClick={() => handleChange('dateFrom', '')}
                    className="hover:text-pink-900 dark:hover:text-pink-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.dateTo && (
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 text-xs rounded-full flex items-center gap-1">
                  To: {new Date(filters.dateTo).toLocaleDateString()}
                  <button
                    onClick={() => handleChange('dateTo', '')}
                    className="hover:text-pink-900 dark:hover:text-pink-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.author && (
                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs rounded-full flex items-center gap-1">
                  Author: {filters.author}
                  <button
                    onClick={() => handleChange('author', '')}
                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.viewsMin && (
                <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs rounded-full flex items-center gap-1">
                  Views ≥ {filters.viewsMin}
                  <button
                    onClick={() => handleChange('viewsMin', '')}
                    className="hover:text-teal-900 dark:hover:text-teal-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.viewsMax && (
                <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs rounded-full flex items-center gap-1">
                  Views ≤ {filters.viewsMax}
                  <button
                    onClick={() => handleChange('viewsMax', '')}
                    className="hover:text-teal-900 dark:hover:text-teal-100"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}












