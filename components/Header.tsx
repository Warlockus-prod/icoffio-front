'use client'

import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";
import { getTranslation } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useState, useEffect } from "react";

export function Header() {
  const [locale, setLocale] = useState<string>('en');
  
  useEffect(() => {
    // Определяем локаль из URL или localStorage
    const pathLocale = window.location.pathname.split('/')[1];
    const supportedLocales = ['en', 'pl', 'de', 'ro', 'cs'];
    
    if (supportedLocales.includes(pathLocale)) {
      setLocale(pathLocale);
    } else {
      // Определяем по языку браузера
      const browserLang = navigator.language.split('-')[0];
      setLocale(supportedLocales.includes(browserLang) ? browserLang : 'en');
    }
  }, []);

  const t = getTranslation(locale as any);
  
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-200">
      <Container>
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="icoffio" width={32} height={32} />
            <span className="font-bold text-xl tracking-tight">icoffio</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href={`/${locale}/category/tech`} className="text-neutral-700 hover:text-black font-medium transition-colors">
              Articles
            </Link>
            <Link href={`/${locale}/category/news-2`} className="text-neutral-700 hover:text-black font-medium transition-colors">
              Reviews
            </Link>
            <Link href={`/${locale}/category/digital`} className="text-neutral-700 hover:text-black font-medium transition-colors">
              Digital
            </Link>
            <Link href={`/${locale}/category/apple`} className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
              #Apple
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector currentLocale={locale} />
            
            <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" title="Search">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {/* Mobile menu button */}
            <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors md:hidden" title="Menu">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </Container>
    </header>
  );
}
