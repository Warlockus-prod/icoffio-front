/**
 * 📰 ARTICLE PAGE - icoffio v7.30.0
 * 
 * Single article display with advertising integration
 * Mock data moved to lib/mock-data.ts for centralization
 */

import { getPostBySlug, getAllSlugs, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import { ArticleContentWithAd } from "@/components/ArticleContentWithAd";
import { SearchModalWrapper } from "@/components/SearchModalWrapper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BackButton } from "@/components/BackButton";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleSchema, BreadcrumbSchema } from "@/components/StructuredData";
import { UniversalAd } from "@/components/UniversalAd";
import { ArticleViewTracker } from "@/components/ArticleViewTracker";
import { getAdPlacementsByLocation } from "@/lib/config/adPlacements";
import VideoPlayer from "@/components/VideoPlayer";
import { getInstreamPlayers, getOutstreamPlayers } from "@/lib/config/video-players";
import { renderContent } from "@/lib/markdown";
import { extractMonetizationSettingsFromContent } from "@/lib/monetization-settings";
import Link from "next/link";
import type { Metadata } from "next";
import type { Post } from "@/lib/types";
// v7.30.0: Centralized mock data
import { mockPostsFull as mockPosts, getMockPostBySlug, getRelatedMockPosts } from "@/lib/mock-data";

export const revalidate = 3600; // 1 hour

// Helper functions using centralized mock data
const getPostBySlugFromMocks = getMockPostBySlug;
const getRelatedFromMocks = getRelatedMockPosts;

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  // Try GraphQL first, fallback to mocks
  let post: Post | null = null;
  
  try {
    post = await getPostBySlug(params.slug, params.locale);
  } catch (error) {
    console.error('GraphQL Error, using mock data:', error);
  }
  
  if (!post) {
    post = getPostBySlugFromMocks(params.slug);
  }
  
  if (!post) return {};

  const publishedTime = new Date(post.publishedAt || post.date || new Date()).toISOString();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/${params.locale}/article/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt || `${post.title} - detailed article on icoffio`,
    keywords: `${post.category.name}, technology, ${post.title}`,
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: post.title,
      description: post.excerpt || `${post.title} - detailed article on icoffio`,
      url,
      siteName: "icoffio",
      images: [
        {
          url: post.image || "/og.png",
          width: 1200,
          height: 630,
          alt: post.imageAlt || post.title,
        },
      ],
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}`,
      type: "article",
      publishedTime,
      section: post.category.name,
      tags: [post.category.name, "technology"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || `${post.title} - detailed article on icoffio`,
      images: [post.image || "/og.png"],
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
      canonical: url,
    },
  };
}

export default async function Article({ params }: { params: { locale: string; slug: string } }) {
  // Try to get post from GraphQL, fallback to mocks
  let post: Post | null = null;
  let related: Post[] = [];
  
  try {
    post = await getPostBySlug(params.slug, params.locale);
    if (post) {
      related = await getRelated(post.category, post.slug, 4);
    }
  } catch (error) {
    console.error('GraphQL Error, using mock data:', error);
  }
  
  if (!post) {
    post = getPostBySlugFromMocks(params.slug);
    if (post) {
      related = getRelatedFromMocks(post.category.slug, post.slug, 4);
    }
  }
  
  if (!post) return notFound();

  // Per-article monetization overrides are stored as a hidden comment in content.
  const { settings: articleMonetizationSettings, cleanContent: cleanArticleContent } =
    extractMonetizationSettingsFromContent(post.content || post.contentHtml || '');

  const defaultArticleAds = getAdPlacementsByLocation('article');
  const enabledAdIds = articleMonetizationSettings
    ? new Set(articleMonetizationSettings.enabledAdPlacementIds)
    : null;
  const articleAds = enabledAdIds
    ? defaultArticleAds.filter((ad) => enabledAdIds.has(ad.id))
    : defaultArticleAds;

  const defaultInstreamPlayers = getInstreamPlayers();
  const defaultOutstreamPlayers = getOutstreamPlayers();
  const enabledVideoIds = articleMonetizationSettings
    ? new Set(articleMonetizationSettings.enabledVideoPlayerIds)
    : null;
  const articleInstreamPlayers = enabledVideoIds
    ? defaultInstreamPlayers.filter((player) => enabledVideoIds.has(player.id))
    : defaultInstreamPlayers;
  const articleOutstreamPlayers = enabledVideoIds
    ? defaultOutstreamPlayers.filter((player) => enabledVideoIds.has(player.id))
    : defaultOutstreamPlayers;

  // Split by position AND device for proper display
  // Desktop banners
  const adsContentTopDesktop = articleAds.filter(ad => ad.position === 'content-top' && ad.device === 'desktop');
  const adsContentBottomDesktop = articleAds.filter(ad => ad.position === 'content-bottom' && ad.device === 'desktop');
  const adsSidebarTop = articleAds.filter(ad => ad.position === 'sidebar-top' && ad.device === 'desktop');
  const adsSidebarBottom = articleAds.filter(ad => ad.position === 'sidebar-bottom' && ad.device === 'desktop');
  const adsFooterDesktop = articleAds.filter(ad => ad.position === 'footer' && ad.device === 'desktop');
  
  // Mobile banners
  const adsContentTopMobile = articleAds.filter(ad => ad.position === 'content-top' && ad.device === 'mobile');
  const adsContentMiddleMobile = articleAds.filter(ad => ad.position === 'content-middle' && ad.device === 'mobile');
  const adsContentBottomMobile = articleAds.filter(ad => ad.position === 'content-bottom' && ad.device === 'mobile');
  const adsFooterMobile = articleAds.filter(ad => ad.position === 'footer' && ad.device === 'mobile');
  
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  const breadcrumbItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: post.title }
  ];

  return (
    <>
      <ArticleSchema post={post} locale={params.locale} />
      <BreadcrumbSchema items={breadcrumbItems} locale={params.locale} />
      
      {/* Track article view for analytics */}
      <ArticleViewTracker articleSlug={post.slug} />
      
      <Container>
        <div className="flex items-center justify-between mb-4">
          <BackButton locale={params.locale} />
        </div>
        <Breadcrumbs items={breadcrumbItems} locale={params.locale} />

        {/* Main Content Grid: Article + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8 max-w-7xl mx-auto">
          
          {/* Main Article Content */}
          <article className="min-w-0">
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Link 
                  href={`/${params.locale}/category/${post.category.slug}`} 
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {post.category.name}
                </Link>
                <time 
                  dateTime={post.publishedAt || post.date} 
                  className="text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {new Date(post.publishedAt || post.date || new Date()).toLocaleDateString(params.locale === 'en' ? 'en-US' : 'pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-6 text-neutral-900 dark:text-neutral-100 leading-tight">
                {post.title}
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {post.excerpt}
              </p>
            </header>

            {/* Hero Image */}
            <div className="mb-8">
              <img 
                src={post.image || fallback} 
                alt={post.imageAlt || post.title} 
                className="w-full rounded-xl aspect-[16/9] object-cover" 
              />
            </div>

            {/* Article Content with Mid-Content Ad */}
            <ArticleContentWithAd 
              content={renderContent(cleanArticleContent)}
              adsDesktop={adsContentTopDesktop}
              adsMobile={adsContentTopMobile}
            />

            {/* Mid-content ads - Mobile ONLY (160x600) */}
            {adsContentMiddleMobile.map((ad) => (
              <UniversalAd 
                key={ad.id}
                placeId={ad.placeId} 
                format={ad.format}
                placement={ad.placement}
                enabled={ad.enabled}
                className="xl:hidden"
              />
            ))}

            {/* Content bottom ads - Desktop */}
            {adsContentBottomDesktop.map((ad) => (
              <UniversalAd 
                key={ad.id}
                placeId={ad.placeId} 
                format={ad.format}
                placement={ad.placement}
                enabled={ad.enabled}
                className="xl:block hidden"
              />
            ))}
            
            {/* Content bottom ads - Mobile */}
            {adsContentBottomMobile.map((ad) => (
              <UniversalAd 
                key={ad.id}
                placeId={ad.placeId} 
                format={ad.format}
                placement={ad.placement}
                enabled={ad.enabled}
                className="xl:hidden"
              />
            ))}

            {/* Instream Video Player - Article End */}
            {articleInstreamPlayers
              .filter(p => p.position === 'article-end')
              .map((player) => (
                <VideoPlayer
                  key={player.id}
                  type={player.type}
                  position={player.position}
                  voxPlaceId={player.voxPlaceId}
                  autoplay={player.autoplay}
                  muted={player.muted}
                  videoTitle={post.title}
                  className={`mt-12 ${player.device === 'desktop' ? 'lg:block hidden' : player.device === 'mobile' ? 'lg:hidden' : ''}`}
                />
              ))}

          </article>

          {/* Sidebar with VOX Display ads */}
          <aside className="xl:sticky xl:top-4 xl:h-fit hidden xl:block">
            
            {/* Sidebar top ads */}
            {adsSidebarTop.map((ad) => (
              <UniversalAd 
                key={ad.id}
                placeId={ad.placeId} 
                format={ad.format}
                placement={ad.placement}
                enabled={ad.enabled}
              />
            ))}

            {/* Outstream Video Player - Sticky Sidebar (Desktop only) */}
            {articleOutstreamPlayers
              .filter(p => p.position === 'sidebar-sticky' && p.device === 'desktop')
              .map((player) => (
                <VideoPlayer
                  key={player.id}
                  type={player.type}
                  position={player.position}
                  voxPlaceId={player.voxPlaceId}
                  autoplay={player.autoplay}
                  muted={player.muted}
                  className="mt-6"
                />
              ))}

            {/* Sidebar bottom ads */}
            {adsSidebarBottom.map((ad) => (
              <UniversalAd 
                key={ad.id}
                placeId={ad.placeId} 
                format={ad.format}
                placement={ad.placement}
                enabled={ad.enabled}
              />
            ))}
            
          </aside>
        </div>

        {/* Footer ads - Desktop */}
        {adsFooterDesktop.map((ad) => (
          <div key={ad.id} className="max-w-7xl mx-auto mt-12">
            <UniversalAd 
              placeId={ad.placeId} 
              format={ad.format}
              placement={ad.placement}
              enabled={ad.enabled}
              className="xl:block hidden"
            />
          </div>
        ))}
        
        {/* Footer ads - Mobile */}
        {adsFooterMobile.map((ad) => (
          <div key={ad.id} className="max-w-7xl mx-auto mt-12">
            <UniversalAd 
              placeId={ad.placeId} 
              format={ad.format}
              placement={ad.placement}
              enabled={ad.enabled}
              className="xl:hidden"
            />
          </div>
        ))}

        {/* Related Articles - Full Width */}
        <div className="mt-16">
          <RelatedArticles 
            posts={related.length > 0 ? related : mockPosts}
            locale={params.locale}
            currentPostSlug={post.slug}
            currentPost={post}
          />
        </div>
      </Container>
    </>
  );
}
