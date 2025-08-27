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

import { getTranslation } from "@/lib/i18n";
import { notFound } from "next/navigation";

const locales = ['en', 'pl', 'de', 'ro', 'cs'];

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!locales.includes(params.locale)) {
    notFound();
  }

  const t = getTranslation(params.locale as any);
  
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t.siteTitle, template: `%s • icoffio` },
    description: t.siteDescription,
    keywords: "technology, gadgets, Apple, iPhone, AI, games, news, reviews",
    openGraph: { 
      title: t.siteTitle, 
      description: t.siteDescription, 
      images: ["/og.png"], 
      type: "website",
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}` 
    },
    twitter: {
      card: "summary_large_image",
      title: t.siteTitle,
      description: t.siteDescription,
    },
    icons: [{ rel: "icon", url: "/favicon.ico" }],
    robots: {
      index: true,
      follow: true,
    },
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
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
