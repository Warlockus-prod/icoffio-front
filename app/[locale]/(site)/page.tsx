/**
 * 🏠 HOMEPAGE - icoffio v7.30.0
 * 
 * Main landing page with articles listing
 * Mock data moved to lib/mock-data.ts for centralization
 */

import Link from "next/link";
import { Suspense } from "react";
import { getAllPosts, getTopPosts, getCategories } from "@/lib/data";
import { getPopularArticles } from "@/lib/supabase-analytics";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticlesList } from "@/components/ArticlesList";
import { Hero } from "@/components/Hero";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { SearchModalWrapper } from "@/components/SearchModalWrapper";
import { ArticleCardSkeleton, CategoryNavSkeleton } from "@/components/LoadingSkeleton";
import { UniversalAd } from "@/components/UniversalAd";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";
// v7.30.0: Centralized mock data
import { mockCategories, mockPostsShort as mockPosts } from "@/lib/mock-data";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: t.siteTitle,
    description: t.siteDescription,
    keywords: "technology, gadgets, Apple, iPhone, AI, games, news, reviews",
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      url: process.env.NEXT_PUBLIC_SITE_URL,
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
      canonical: process.env.NEXT_PUBLIC_SITE_URL,
      languages: {
        'en': '/en',
        'pl': '/pl',
      },
    },
  };
}

export const revalidate = 60; // 1 minute for testing (change to 3600 in production)

// Mock data is now imported from lib/mock-data.ts (v7.30.0)

export default async function Page({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  
  // Инициализация с моками как fallback
  let heroPosts: any[] = mockPosts.slice(0, 3);
  let posts: any[] = mockPosts.slice(0, 9);
  let cats: any[] = mockCategories;
  
  try {
    // 1. HERO: Топ 3 статьи из GraphQL
    const graphqlHeroPosts = await getTopPosts(3);
    if (graphqlHeroPosts && graphqlHeroPosts.length > 0) {
      heroPosts = graphqlHeroPosts;
      console.log(`[Home] ✅ Hero: ${graphqlHeroPosts.length} posts from GraphQL`);
    }
    
    // 2. CATEGORIES: Из GraphQL
    const graphqlCats = await getCategories(params.locale);
    if (graphqlCats && graphqlCats.length > 0) {
      cats = graphqlCats;
    }
    
    // 3. LATEST/POPULAR: Сначала пробуем популярные из Supabase
    const popularSlugs = await getPopularArticles(12, params.locale);
    
    // 4. Получаем ВСЕ статьи из GraphQL (независимо от Supabase)
    const allPosts = await getAllPosts(20, params.locale);
    
    if (allPosts && allPosts.length > 0) {
      if (popularSlugs && popularSlugs.length > 0) {
        // Есть популярные - сортируем по ним
        const popularPosts = popularSlugs
          .map(slug => allPosts.find(p => p.slug === slug))
          .filter(Boolean)
          .slice(0, 9);
        
        if (popularPosts.length >= 3) {
          posts = popularPosts;
          console.log(`[Home] ✅ Showing ${popularPosts.length} POPULAR articles for ${params.locale}`);
        } else {
          // Мало популярных - показываем последние
          posts = allPosts.slice(0, 9);
          console.log(`[Home] ℹ️ Not enough popular, showing ${posts.length} LATEST for ${params.locale}`);
        }
      } else {
        // Supabase пустой - показываем последние из GraphQL
        posts = allPosts.slice(0, 9);
        console.log(`[Home] ℹ️ No Supabase data, showing ${posts.length} LATEST for ${params.locale}`);
      }
    } else {
      console.log(`[Home] ⚠️ No GraphQL posts for ${params.locale}, using mocks`);
    }
    
  } catch (error) {
    console.error('[Home] ❌ Error fetching data, using mocks:', error);
  }

  return (
    <>
      <Container>
        <CategoryNav categories={cats} locale={params.locale} />
      </Container>

      {heroPosts && heroPosts.length > 0 && <Hero posts={heroPosts} locale={params.locale} />}

      {/* Articles list with Newest/Popular tabs */}
      <div className="mx-auto max-w-6xl px-4">
        <ArticlesList posts={posts} locale={params.locale} />

        <div className="mt-12 text-center">
          <Link 
            href={`/${params.locale}/articles`}
            className="group relative inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            <span className="relative z-10 flex items-center gap-2">
              {t.showMore}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
          </Link>
        </div>

        {/* Homepage Bottom Ad - Desktop (970x250 Large Leaderboard) */}
        <div className="mt-16 hidden xl:block">
          <UniversalAd 
            placeId="63daa3c24d506e16acfd2a38"
            format="970x250"
            placement="inline"
            enabled={true}
          />
        </div>
        
        {/* Homepage Bottom Ad - Mobile (320x100 Large Mobile Banner) */}
        <div className="mt-12 xl:hidden">
          <UniversalAd 
            placeId="68f645bf810d98e1a08f272f"
            format="320x100"
            placement="mobile"
            enabled={true}
          />
        </div>
      </div>
    </>
  );
}
