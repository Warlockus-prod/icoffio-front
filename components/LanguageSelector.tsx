'use client'

import { useState } from 'react';
import { localeNames } from '@/lib/i18n';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // Получаем текущий путь без локали
    let currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
    
    // 🔧 v7.31.0 FIX: Handle article slug suffixes when switching languages
    // Articles use -en/-pl suffixes for routing (e.g., my-article-en, my-article-pl)
    if (currentPath.startsWith('/article/')) {
      const slugMatch = currentPath.match(/\/article\/(.+)$/);
      if (slugMatch) {
        let slug = slugMatch[1];
        
        // Remove trailing slash if present
        slug = slug.replace(/\/$/, '');
        
        // Replace language suffix: -en → -pl or -pl → -en
        if (slug.endsWith(`-${currentLocale}`)) {
          slug = slug.replace(new RegExp(`-${currentLocale}$`), `-${newLocale}`);
          currentPath = `/article/${slug}`;
        } else if (!slug.endsWith('-en') && !slug.endsWith('-pl')) {
          // If no suffix, add the target language suffix
          currentPath = `/article/${slug}-${newLocale}`;
        }
      }
    }
    
    // Переходим на новый путь с новой локалью  
    router.push(`/${newLocale}${currentPath}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
      >
        <span className="text-sm font-medium">{currentLocale.toUpperCase()}</span>
        <svg 
          className="size-4 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
          {Object.entries(localeNames).map(([locale, name]) => (
            <button
              key={locale}
              onClick={() => switchLanguage(locale)}
              className={`block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors ${
                locale === currentLocale ? 'bg-neutral-100 dark:bg-neutral-700 font-medium' : ''
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
