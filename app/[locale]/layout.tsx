import "@/styles/globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WebVitals } from "@/components/WebVitals";
import { ReadingProgress } from "@/components/ReadingProgress";
import { BackToTop } from "@/components/BackToTop";
import { Analytics } from "@/components/Analytics";
import { SearchProvider } from "@/components/SearchProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WebsiteSchema, OrganizationSchema } from "@/components/StructuredData";
import { TestPanel } from "@/components/TestPanel";
import { SearchModalWrapper } from "@/components/SearchModalWrapper";

import { getTranslation } from "@/lib/i18n";
import { notFound } from "next/navigation";

const locales = ['en', 'pl'];

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!locales.includes(params.locale)) {
    notFound();
  }

  const t = getTranslation(params.locale as any);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://icoffio.com";
  
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.siteTitle, template: `%s • icoffio` },
    description: t.siteDescription,
    keywords: [
      "technology", "gadgets", "Apple", "iPhone", "AI", "artificial intelligence",
      "games", "news", "reviews", "tech news", "innovation", "smartphones",
      "laptops", "quantum computing", "cybersecurity", "blockchain", "web3",
      "metaverse", "virtual reality", "augmented reality", "machine learning",
      "robotics", "automation", "sustainable tech", "green computing"
    ].join(", "),
    authors: [{ name: "icoffio Editorial Team", url: siteUrl }],
    creator: "icoffio",
    publisher: "icoffio",
    category: "Technology",
    classification: "Technology News and Reviews",
    viewport: "width=device-width, initial-scale=1, maximum-scale=5",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#111827" }
    ],
    colorScheme: "light dark",
    openGraph: { 
      type: "website",
      siteName: "icoffio",
      title: t.siteTitle, 
      description: t.siteDescription, 
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "icoffio — Technology News and Reviews"
        }
      ], 
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}`,
      url: `${siteUrl}/${params.locale}`
    },
    twitter: {
      card: "summary_large_image",
      site: "@icoffio",
      creator: "@icoffio",
      title: t.siteTitle,
      description: t.siteDescription,
      images: ["/og.png"]
    },
    alternates: {
      canonical: `${siteUrl}/${params.locale}`,
      languages: Object.fromEntries(
        locales.map(locale => [locale, `${siteUrl}/${locale}`])
      ),
    },
    icons: [
      { rel: "icon", type: "image/svg+xml", url: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", url: "/favicon.ico" },
      { rel: "apple-touch-icon", url: "/favicon.svg", sizes: "180x180" },
      { rel: "mask-icon", url: "/favicon.svg", color: "#111827" }
    ],
    manifest: "/manifest.json",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      other: {
        "msvalidate.01": process.env.BING_VERIFICATION || "",
      }
    },
    other: {
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": "icoffio",
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": "#111827",
      "msapplication-config": "/browserconfig.xml"
    }
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale
  if (!locales.includes(params.locale)) {
    notFound();
  }

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme') || 'system';
                  
                  // Функция для определения темной темы по времени суток
                  function isDarkByTime() {
                    var hour = new Date().getHours();
                    return hour < 6 || hour >= 18; // Темно с 18:00 до 6:00
                  }
                  
                  // Функция для получения вычисленной темы
                  function getComputedTheme(theme) {
                    if (theme === 'system') {
                      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                      return prefersDark || isDarkByTime() ? 'dark' : 'light';
                    }
                    return theme;
                  }
                  
                  var computedTheme = getComputedTheme(savedTheme);
                  var shouldBeDark = computedTheme === 'dark';
                  
                  var html = document.documentElement;
                  html.classList.remove('light', 'dark');
                  
                  if (shouldBeDark) {
                    html.classList.add('dark');
                  } else {
                    html.classList.add('light');
                  }
                } catch (e) {
                  // Fallback - применяем светлую тему
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
        <WebsiteSchema locale={params.locale} />
        <OrganizationSchema locale={params.locale} />
      </head>
      <body className="min-h-dvh bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 antialiased selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-neutral-900 transition-colors duration-300">
        <ThemeProvider>
          <SearchProvider>
            <ReadingProgress />
            <WebVitals />
            <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID || 'G-35P327PYGH'} />
            <Header />
            <main className="pb-10">{children}</main>
            <Footer locale={params.locale} />
            <BackToTop />
            <SearchModalWrapper posts={[]} locale={params.locale} />
            <TestPanel locale={params.locale} />
          </SearchProvider>
        </ThemeProvider>

        {/* VOX рекламный скрипт - полная версия с исправлениями */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('VOX DEBUG: Script initialization started');
              if (typeof window._tx === "undefined") {
                  console.log('VOX DEBUG: _tx undefined, loading VOX script');
                  var s = document.createElement("script");
                  s.type = "text/javascript";
                  s.async = true;
                  // Добавляем более агрессивный cache buster
                  s.src = "https://st.hbrd.io/ssp.js?t=" + new Date().getTime() + "&r=" + Math.random();
                  (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
                  
                  s.onload = function() {
                      console.log('VOX DEBUG: VOX script loaded successfully');
                  };
                  s.onerror = function() {
                      console.error('VOX ERROR: Failed to load VOX script');
                  };
              } else {
                  console.log('VOX DEBUG: _tx already exists, skipping script load');
              }
              window._tx = window._tx || {};
              window._tx.cmds = window._tx.cmds || [];
              
              // Функция инициализации VOX с избирательным показом
              function initVOX() {
                  console.log('VOX DEBUG: initVOX() called');
                  
                  // Проверяем, что мы на странице статьи
                  const currentUrl = window.location.pathname;
                  const isArticlePage = currentUrl.includes('/article/');
                  
                  console.log('VOX DEBUG: currentUrl =', currentUrl);
                  console.log('VOX DEBUG: isArticlePage =', isArticlePage);
                  
                  if (!isArticlePage) {
                      console.log('VOX: Не страница статьи, пропускаем инициализацию');
                      return;
                  }
                  
                  console.log('VOX: Инициализация на странице статьи:', currentUrl);
                  
                  // Проверяем доступность VOX API
                  if (!window._tx || !window._tx.integrateInImage) {
                      console.error('VOX ERROR: _tx.integrateInImage не доступен!');
                      return;
                  }
                  
                  console.log('VOX DEBUG: Вызов integrateInImage...');
                  window._tx.integrateInImage({
                      placeId: "63d93bb54d506e95f039e2e3",
                      selector: 'article img:not(.group img):not([class*="aspect-[16/9]"] img), .prose img, article > div img',
                      setDisplayBlock: true
                  });
                  
                  console.log('VOX DEBUG: Вызов init...');
                  window._tx.init();
                  console.log('VOX DEBUG: initVOX() завершен');
              }
              
              // Переменная для отслеживания последнего URL
              window._voxLastUrl = window._voxLastUrl || '';
              
              // Функция для проверки и перезапуска VOX при изменении страницы
              function checkAndInitVOX() {
                  console.log('VOX DEBUG: checkAndInitVOX() called');
                  
                  const currentUrl = window.location.href;
                  console.log('VOX DEBUG: currentUrl =', currentUrl);
                  console.log('VOX DEBUG: _voxLastUrl =', window._voxLastUrl);
                  
                  // Если URL изменился или это первый запуск
                  if (window._voxLastUrl !== currentUrl || window._voxLastUrl === '') {
                      window._voxLastUrl = currentUrl;
                      console.log('VOX: URL изменился на:', currentUrl);
                      
                      // Небольшая задержка для загрузки контента
                      setTimeout(function() {
                          console.log('VOX DEBUG: setTimeout callback - calling initVOX');
                          initVOX();
                      }, 1000);
                  } else {
                      console.log('VOX DEBUG: URL не изменился, пропускаем инициализацию');
                  }
              }
              
              window._tx.cmds.push(function () {
                  console.log('VOX DEBUG: _tx.cmds callback executed');
                  console.log('VOX DEBUG: document.readyState =', document.readyState);
                  
                  // Первоначальная инициализация с проверкой готовности DOM
                  if (document.readyState === 'complete') {
                      console.log('VOX DEBUG: DOM ready, calling checkAndInitVOX immediately');
                      checkAndInitVOX();
                  } else {
                      console.log('VOX DEBUG: DOM not ready, setting up listeners');
                      window.addEventListener('load', function() {
                          console.log('VOX DEBUG: window load event fired');
                          checkAndInitVOX();
                      });
                      setTimeout(function() {
                          console.log('VOX DEBUG: setTimeout fallback fired (2000ms)');
                          checkAndInitVOX();
                      }, 2000);
                  }
                  
                  // Отслеживание изменений URL для Next.js client-side navigation
                  console.log('VOX DEBUG: Setting up URL monitoring interval');
                  const checkUrlInterval = setInterval(function() {
                      console.log('VOX DEBUG: Interval check (1500ms)');
                      checkAndInitVOX();
                  }, 1500);
                  
                  // Очистка интервала при необходимости (для производительности)
                  window.addEventListener('beforeunload', function() {
                      console.log('VOX DEBUG: beforeunload - clearing interval');
                      if (typeof checkUrlInterval !== 'undefined') {
                          clearInterval(checkUrlInterval);
                      }
                  });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
