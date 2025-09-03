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

const locales = ['en', 'pl', 'de', 'ro', 'cs'];

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
            <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
            <Header />
            <main className="pb-10">{children}</main>
            <Footer locale={params.locale} />
            <BackToTop />
            <SearchModalWrapper posts={[]} locale={params.locale} />
            <TestPanel locale={params.locale} />
          </SearchProvider>
        </ThemeProvider>

        {/* VOX Advertising Script - In-Image Ads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window._tx === "undefined") {
                  var s = document.createElement("script");
                  s.type = "text/javascript";
                  s.async = true;
                  s.src = "https://st.hbrd.io/ssp.js?t=" + new Date().getTime();
                  (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
              }
              window._tx = window._tx || {};
              window._tx.cmds = window._tx.cmds || [];
              
              // Функция для инициализации VOX с ожиданием загрузки изображений
              function initVOX() {
                  window._tx.integrateInImage({
                      placeId: "63d93bb54d506e95f039e2e3",
                      setDisplayBlock: true
                  });
                  window._tx.init();
              }
              
              window._tx.cmds.push(function () {
                  // Проверяем готовность изображений и DOM
                  if (document.readyState === 'complete') {
                      // Страница уже полностью загружена
                      initVOX();
                  } else {
                      // Ждем полной загрузки включая изображения
                      window.addEventListener('load', function() {
                          initVOX();
                      });
                      
                      // Дополнительная задержка для надежности
                      setTimeout(function() {
                          initVOX();
                      }, 2000);
                  }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
