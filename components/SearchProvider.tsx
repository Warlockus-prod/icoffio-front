'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import type { Post } from '@/lib/types';
import { SearchModal } from './SearchModal';

interface SearchContextType {
  openSearch: () => void;
  closeSearch: () => void;
  isSearchOpen: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

interface SearchProviderProps {
  children: React.ReactNode;
  posts: Post[];
  locale: string;
}

export function SearchProvider({ children, posts, locale }: SearchProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  // Добавляем горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = {
    openSearch,
    closeSearch,
    isSearchOpen,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        posts={posts}
        locale={locale}
      />
    </SearchContext.Provider>
  );
}
