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

        {/* CSS для VOX Display рекламы - ПОЛНАЯ СВОБОДА БЕЗ ОГРАНИЧЕНИЙ */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* VOX контейнеры - полная свобода для рекламы */
            [data-hyb-ssp-ad-place] {
              display: block !important;
              text-align: center !important;
              overflow: visible !important;
              max-width: none !important;
              max-height: none !important;
              width: auto !important;
              height: auto !important;
              min-width: unset !important;
              min-height: unset !important;
            }
            
            [data-hyb-ssp-ad-place] iframe,
            [data-hyb-ssp-ad-place] > div,
            [data-hyb-ssp-ad-place] * {
              max-width: none !important;
              max-height: none !important;
              width: auto !important;
              height: auto !important;
              min-width: unset !important;
              min-height: unset !important;
              overflow: visible !important;
            }
          `
        }} />

        {/* VOX рекламный скрипт - ОБЪЕДИНЕННАЯ ВЕРСИЯ (In-Image + Display) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window._tx === "undefined") {
                  var s = document.createElement("script");
                  s.type = "text/javascript";
                  s.async = true;
                  // Кеширование VOX скрипта - убрали timestamp для браузерного кеша
                  s.src = "https://st.hbrd.io/ssp.js";
                  // Форсируем загрузку с высоким приоритетом
                  s.setAttribute('fetchpriority', 'high');
                  (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
              }
              window._tx = window._tx || {};
              window._tx.cmds = window._tx.cmds || [];
              
              // Функция инициализации VOX с поддержкой переинициализации
              function initVOX() {
                  console.log('VOX: Инициализация начата для URL:', window.location.href);
                  
                  // Проверяем доступность VOX API
                  if (typeof window._tx === 'undefined' || !window._tx.integrateInImage) {
                      console.log('VOX: API не готов, пропуск инициализации');
                      return;
                  }
                  
                  try {
                      // 1. In-Image реклама (для всех страниц)
                      window._tx.integrateInImage({
                          placeId: "63d93bb54d506e95f039e2e3",
                          fetchSelector: true,
                      });
                      console.log('VOX: In-Image инициализирована');
                      
                      // 2. Display форматы (только для страниц где есть контейнеры)
                      const displayPlacements = [
                          { id: "63da9b577bc72f39bc3bfc68", format: "728x90" },
                          { id: "63da9e2a4d506e16acfd2a36", format: "300x250" },
                          { id: "63daa3c24d506e16acfd2a38", format: "970x250" },
                          { id: "63daa2ea7bc72f39bc3bfc72", format: "300x600" }
                      ];
                      
                      let displayCount = 0;
                      displayPlacements.forEach(function(placement) {
                          const container = document.querySelector('[data-hyb-ssp-ad-place="' + placement.id + '"]');
                          if (container) {
                              window._tx.integrateInImage({
                                  placeId: placement.id,
                                  fetchSelector: true,
                              });
                              console.log('VOX: Display format ' + placement.format + ' инициализирован');
                              displayCount++;
                          }
                      });
                      
                      console.log('VOX: Найдено ' + displayCount + ' display контейнеров');
                      
                      // 3. Система показа контейнеров после загрузки рекламы
                      function setupAdVisibilityWatcher() {
                          const observer = new MutationObserver(function(mutations) {
                              mutations.forEach(function(mutation) {
                                  if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                      const target = mutation.target;
                                      if (target.hasAttribute && target.hasAttribute('data-hyb-ssp-ad-place')) {
                                          // VOX добавил содержимое в контейнер - показываем его
                                          target.style.opacity = '1';
                                          console.log('VOX: Контейнер показан после загрузки рекламы');
                                      }
                                  }
                              });
                          });
                          
                          // Наблюдаем за всеми ad контейнерами
                          document.querySelectorAll('[data-hyb-ssp-ad-place]').forEach(function(container) {
                              observer.observe(container, { childList: true, subtree: true });
                          });
                          
                          // Fallback - показываем контейнеры через 2 секунды если ничего не загрузилось  
                          setTimeout(function() {
                              document.querySelectorAll('[data-hyb-ssp-ad-place]').forEach(function(container) {
                                  if (container.children.length > 0 || container.innerHTML.trim() !== '') {
                                      container.style.opacity = '1';
                                  }
                              });
                          }, 2000); // Оптимизировано - уменьшен с 3000 до 2000ms
                      }
                      
                      // 4. Финальная инициализация (только если есть контейнеры)
                      const totalContainers = document.querySelectorAll('[data-hyb-ssp-ad-place]').length;
                      if (totalContainers > 0 || window.location.href.includes('/article/')) {
                          setupAdVisibilityWatcher();
                          window._tx.init();
                          console.log('VOX: Инициализация завершена для ' + totalContainers + ' контейнеров');
                      } else {
                          console.log('VOX: Контейнеры не найдены, инициализация пропущена');
                      }
                      
                  } catch (error) {
                      console.error('VOX: Ошибка инициализации:', error);
                  }
              }
              
              // Переменные для отслеживания инициализации
              let voxInitialized = false;
              let currentUrl = '';
              
              // Система отслеживания URL для Next.js client-side navigation
              function checkAndReinitVOX() {
                  const newUrl = window.location.href;
                  
                  if (newUrl !== currentUrl) {
                      console.log('VOX: Обнаружена смена URL:', currentUrl, '->', newUrl);
                      
                      const oldUrl = currentUrl;
                      currentUrl = newUrl;
                      
                      // Переинициализируем только при переходах между статьями или на статьи
                      const isNewArticle = newUrl.includes('/article/');
                      const wasArticle = oldUrl.includes('/article/');
                      
                      if (isNewArticle || wasArticle) {
                          console.log('VOX: Переинициализация - переход между статьями');
                          
                          // Минимальная задержка для обновления DOM после Next.js navigation
                          setTimeout(function() {
                              if (typeof window._tx !== 'undefined' && window._tx.integrateInImage) {
                                  initVOX();
                              }
                          }, 300); // Оптимизировано - уменьшена задержка
                      } else {
                          console.log('VOX: Переход не требует переинициализации');
                      }
                  }
              }
              
              // Запуск VOX с поддержкой Next.js navigation
              window._tx.cmds.push(function () {
                  console.log('VOX: Команда добавлена в очередь');
                  
                  // Инициализация при первой загрузке
                  function firstInit() {
                      currentUrl = window.location.href;
                      console.log('VOX: Первая инициализация для URL:', currentUrl);
                      initVOX();
                      
                      // Запускаем мониторинг URL изменений для Next.js navigation
                      setInterval(checkAndReinitVOX, 1000);
                  }
                  
                  if (document.readyState === 'complete') {
                      firstInit();
                  } else {
                      window.addEventListener('load', firstInit);
                      setTimeout(firstInit, 1000); // Оптимизировано - уменьшен fallback с 2000 до 1000ms
                  }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
