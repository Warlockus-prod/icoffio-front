'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { getTranslation } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useSearch } from "./SearchProvider";
import { CategoryIcon } from "./CategoryIcon";
import { useTheme } from "./ThemeProvider";

export function Header() {
  const [locale, setLocale] = useState<string>('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { openSearch } = useSearch();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  useEffect(() => {
    // Get locale from URL
    const pathLocale = window.location.pathname.split('/')[1];
    const supportedLocales = ['en', 'pl', 'de', 'ro', 'cs'];
    
    if (supportedLocales.includes(pathLocale)) {
      setLocale(pathLocale);
    } else {
      const browserLang = navigator.language.split('-')[0];
      setLocale(supportedLocales.includes(browserLang) ? browserLang : 'en');
    }
  }, []);

  const categories = [
    { name: "AI", href: `/${locale}/category/ai` },
    { name: "Apple", href: `/${locale}/category/apple` },
    { name: "Digital", href: `/${locale}/category/digital` },
    { name: "Tech", href: `/${locale}/category/tech` },
    { name: "News", href: `/${locale}/category/news-2` }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 h-14">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href={`/${locale}`} className="font-bold tracking-tight text-xl text-neutral-900 dark:text-white">
          ICOFFIO
        </Link>
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          className="md:hidden p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Navigation */}
        <nav className="hidden md:flex gap-4 text-sm">
          {categories.map(category => (
            <Link
              key={category.name}
              href={category.href}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <CategoryIcon category={category.name} size="sm" />
              {category.name}
            </Link>
          ))}
        </nav>
        
        {/* Right section */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <button
            onClick={openSearch}
            className="relative hidden md:flex items-center gap-2 text-sm px-3 py-1.5 pl-8 pr-3 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 w-48 text-left"
          >
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search articles...</span>
            <kbd className="ml-auto text-xs bg-neutral-200 dark:bg-neutral-600 px-1.5 py-0.5 rounded border">⌘K</kbd>
          </button>

          {/* Language Selector */}
          <LanguageSelector currentLocale={locale} />
          
          {/* Theme Toggle - 3 режима: Light/Dark/System */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch theme, current: ${theme}`}
            className="relative p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all duration-300 group"
            title={`Current: ${theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Auto'} theme`}
          >
            {/* Light Mode Icon */}
            {theme === 'light' && (
              <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            
            {/* Dark Mode Icon */}
            {theme === 'dark' && (
              <svg className="w-4 h-4 transition-transform group-hover:-rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            
            {/* System/Auto Mode Icon */}
            {theme === 'system' && (
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
            )}
            
            {/* Маленький индикатор режима */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full text-[8px] flex items-center justify-center font-bold text-white shadow-sm">
              {theme === 'light' && <span className="bg-yellow-500 w-2 h-2 rounded-full"></span>}
              {theme === 'dark' && <span className="bg-indigo-600 w-2 h-2 rounded-full"></span>}
              {theme === 'system' && <span className="bg-gradient-to-r from-yellow-500 to-indigo-600 w-2 h-2 rounded-full animate-pulse"></span>}
            </span>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <nav className="px-4 py-4 space-y-2">
            {categories.map(category => (
              <Link
                key={category.name}
                href={category.href}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <CategoryIcon category={category.name} size="sm" />
                {category.name}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => {
                  openSearch();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 text-sm px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search articles...</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
