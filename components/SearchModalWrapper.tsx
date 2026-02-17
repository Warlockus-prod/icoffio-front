'use client'

import { useSearch } from './SearchProvider';
import { AdvancedSearch } from './AdvancedSearch';
import type { Post } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';

interface SearchModalWrapperProps {
  posts: Post[];
  locale: string;
}

export function SearchModalWrapper({ posts: initialPosts, locale }: SearchModalWrapperProps) {
  const { isSearchOpen, closeSearch } = useSearch();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const hasFetchedRef = useRef(false);

  // Загружаем посты client-side если их нет (один раз)
  useEffect(() => {
    if (initialPosts.length === 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetch(`/api/supabase-articles?lang=${locale}&limit=100`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.articles) {
            setPosts(data.articles);
          }
        })
        .catch(err => console.error('Failed to load articles for search:', err));
    }
  }, [initialPosts.length, locale]);

  return (
    <AdvancedSearch
      isOpen={isSearchOpen}
      onClose={closeSearch}
      posts={posts}
      locale={locale}
    />
  );
}
