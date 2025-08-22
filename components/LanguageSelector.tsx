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
    const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
    
    // Переходим на новый путь с новой локалью  
    router.push(`/${newLocale}${currentPath}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
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
        <div className="absolute right-0 top-full mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
          {Object.entries(localeNames).map(([locale, name]) => (
            <button
              key={locale}
              onClick={() => switchLanguage(locale)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 transition-colors ${
                locale === currentLocale ? 'bg-neutral-100 font-medium' : ''
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
