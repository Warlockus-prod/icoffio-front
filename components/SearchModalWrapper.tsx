'use client'

import { useSearch } from './SearchProvider';
import { AdvancedSearch } from './AdvancedSearch';
import type { Post } from '@/lib/types';
import { useState, useEffect } from 'react';

interface SearchModalWrapperProps {
  posts: Post[];
  locale: string;
}

export function SearchModalWrapper({ posts: initialPosts, locale }: SearchModalWrapperProps) {
  const { isSearchOpen, closeSearch } = useSearch();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем посты client-side если их нет
  useEffect(() => {
    if (initialPosts.length === 0 && !isLoading) {
      setIsLoading(true);
      fetch(`/api/articles?locale=${locale}&limit=50`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.articles) {
            setPosts(data.articles);
          }
        })
        .catch(err => console.error('Failed to load articles for search:', err))
        .finally(() => setIsLoading(false));
    }
  }, [initialPosts.length, locale, isLoading]);

  return (
    <AdvancedSearch
      isOpen={isSearchOpen}
      onClose={closeSearch}
      posts={posts}
      locale={locale}
    />
  );
}

