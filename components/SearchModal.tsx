'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  locale: string;
}

export function SearchModal({ isOpen, onClose, posts, locale }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const filtered = posts.filter(post =>
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      post.category.name.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered.slice(0, 6)); // Показываем топ-6 результатов
  }, [query, posts]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-start justify-center p-4 pt-20">
        <div 
          className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-4 py-4 text-lg bg-neutral-50 dark:bg-neutral-800 border-0 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
              />
              <button
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim().length >= 2 && (
              <div className="p-4">
                {results.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 px-2">
                      Found {results.length} result{results.length !== 1 ? 's' : ''}
                    </div>
                    {results.map((post) => (
                      <Link
                        key={post.slug}
                        href={`/${locale}/article/${post.slug}`}
                        onClick={onClose}
                        className="flex gap-4 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors group"
                      >
                        <img
                          src={post.image}
                          alt={post.imageAlt || post.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 text-sm">
                            {post.title}
                          </h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-1">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              {post.category.name}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {new Date(post.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.002-5.824-2.555M15 6.306a7.962 7.962 0 00-6-0c-2.34 0-4.291 1.002-5.824 2.555" />
                    </svg>
                    <p className="text-lg font-medium mb-1">No results found</p>
                    <p className="text-sm">Try different keywords</p>
                  </div>
                )}
              </div>
            )}
            
            {query.trim().length < 2 && (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Start typing to search articles...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





