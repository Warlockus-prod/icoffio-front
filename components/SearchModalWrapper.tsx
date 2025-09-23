'use client'

import { useSearch } from './SearchProvider';
import { AdvancedSearch } from './AdvancedSearch';
import type { Post } from '@/lib/types';

interface SearchModalWrapperProps {
  posts: Post[];
  locale: string;
}

export function SearchModalWrapper({ posts, locale }: SearchModalWrapperProps) {
  const { isSearchOpen, closeSearch } = useSearch();

  return (
    <AdvancedSearch
      isOpen={isSearchOpen}
      onClose={closeSearch}
      posts={posts}
      locale={locale}
    />
  );
}

