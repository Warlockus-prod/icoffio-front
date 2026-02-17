import Link from "next/link";
import { getAllPosts, getCategories } from "@/lib/data";
import { getPopularArticles } from "@/lib/supabase-analytics";
import { Hero } from "@/components/Hero";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { ArticlesList } from "@/components/ArticlesList";
import { UniversalAd } from "@/components/UniversalAd";
import { VOX_PLACES } from "@/lib/vox-advertising";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  const siteUrl = getSiteBaseUrl();
  const languageAlternates: Record<string, string> = {
    en: `${siteUrl}/en`,
    pl: `${siteUrl}/pl`,
    "x-default": `${siteUrl}/en`,
  };

  return {
    title: t.siteTitle,
    description: t.siteDescription,
    keywords: "technology, gadgets, Apple, iPhone, AI, games, news, reviews",
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      url: `${siteUrl}/${params.locale}`,
      siteName: "icoffio",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "icoffio - technology and gadgets",
        },
      ],
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t.siteTitle,
      description: t.siteDescription,
      images: ["/og.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: `${siteUrl}/${params.locale}`,
      languages: languageAlternates,
    },
  };
}

export const revalidate = 300;

export default async function Page({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);

  const [allPosts, cats] = await Promise.all([
    getAllPosts(20, params.locale),
    getCategories(params.locale),
  ]);

  const heroPosts = allPosts.slice(0, 3);
  let posts = allPosts.slice(0, 9);

  try {
    const popularSlugs = await getPopularArticles(12, params.locale);
    if (popularSlugs && popularSlugs.length > 0) {
      const popularPosts = popularSlugs
        .map((slug) => allPosts.find((post) => post.slug === slug))
        .filter(Boolean)
        .slice(0, 9);

      if (popularPosts.length >= 3) {
        posts = popularPosts as typeof allPosts;
      }
    }
  } catch (error) {
    console.warn('[home] Popular stats unavailable, showing latest:', error);
  }

  return (
    <>
      <Container>
        <CategoryNav categories={cats} locale={params.locale} />
      </Container>

      {heroPosts.length > 0 && <Hero posts={heroPosts} locale={params.locale} />}

      <div className="mx-auto mt-6 max-w-6xl px-4">
        <ArticlesList posts={posts} locale={params.locale} />

        <div className="mt-12 text-center">
          <Link
            href={`/${params.locale}/articles`}
            className="group relative inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            <span className="relative z-10 flex items-center gap-2">
              {t.showMore}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
        </div>

        <div className="mt-16 hidden text-center xl:block">
          <UniversalAd placeId={VOX_PLACES.LARGE_LEADERBOARD} format="970x250" placement="inline" />
        </div>

        <div className="mt-12 flex justify-center xl:hidden">
          <UniversalAd placeId={VOX_PLACES.MOBILE_LARGE} format="320x100" placement="mobile" />
        </div>
      </div>
    </>
  );
}
