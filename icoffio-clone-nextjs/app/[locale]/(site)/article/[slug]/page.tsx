/**
 * Article Page — icoffio
 * 
 * Рекламные места (по ADVERTISING_CODES_GUIDE.md):
 * 
 * Desktop:
 *   728x90  — после заголовка (inline)
 *   300x250 — sidebar top
 *   300x600 — sidebar bottom
 *   970x250 — перед Related Articles
 * 
 * Mobile:
 *   320x100 — после контента
 * 
 * In-Image — автоматически через VOX скрипт в layout.tsx
 */

import { getPostBySlug, getAllSlugs, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ArticleContentWithAd } from "@/components/ArticleContentWithAd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BackButton } from "@/components/BackButton";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleSchema, BreadcrumbSchema } from "@/components/StructuredData";
import { UniversalAd } from "@/components/UniversalAd";
import VideoPlayer from "@/components/VideoPlayer";
import { ArticleViewTracker } from "@/components/ArticleViewTracker";
import { VOX_PLACES } from "@/lib/vox-advertising";
import { getVideoPlayerById } from "@/lib/config/video-players";
import type { AdPlacementConfig } from "@/lib/config/adPlacements";
import { renderContent } from "@/lib/markdown";
import Link from "next/link";
import type { Metadata } from "next";
import type { Post } from "@/lib/types";
import { mockPostsFull as mockPosts, getMockPostBySlug, getRelatedMockPosts } from "@/lib/mock-data";

export const revalidate = 3600;

const getPostBySlugFromMocks = getMockPostBySlug;
const getRelatedFromMocks = getRelatedMockPosts;

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
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
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: { canonical: url },
  };
}

export default async function Article({ params }: { params: { locale: string; slug: string } }) {
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
  
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  const breadcrumbItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: post.title }
  ];
  const articleEndVideoPlayer = getVideoPlayerById('instream-article-end');
  const mobileInContentSidebarAds: AdPlacementConfig[] = [
    {
      id: 'mobile-reflow-sidebar-top',
      placeId: VOX_PLACES.MEDIUM_RECTANGLE,
      format: '300x250',
      placement: 'mobile',
      name: 'Mobile Reflow Sidebar Top',
      description: 'Desktop sidebar top placement shown inside article flow on mobile',
      location: 'article',
      position: 'content-middle',
      enabled: true,
      priority: 9,
      device: 'mobile',
      addedDate: '2026-02-14',
      status: 'stable',
    },
    {
      id: 'mobile-reflow-sidebar-bottom',
      placeId: VOX_PLACES.LARGE_SKYSCRAPER,
      format: '300x600',
      placement: 'mobile',
      name: 'Mobile Reflow Sidebar Bottom',
      description: 'Desktop sidebar bottom placement shown deeper in article flow on mobile',
      location: 'article',
      position: 'content-bottom',
      enabled: true,
      priority: 7,
      device: 'mobile',
      addedDate: '2026-02-14',
      status: 'stable',
    },
  ];

  return (
    <>
      <ArticleSchema post={post} locale={params.locale} />
      <BreadcrumbSchema items={breadcrumbItems} locale={params.locale} />
      <ArticleViewTracker articleSlug={post.slug} />
      
      <Container>
        <div className="flex items-center justify-between mb-4">
          <BackButton locale={params.locale} />
        </div>
        <Breadcrumbs items={breadcrumbItems} locale={params.locale} />

        {/* ====== MAIN GRID: Article + Sidebar ====== */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8 max-w-7xl mx-auto">
          
          {/* === Article === */}
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
                    year: 'numeric', month: 'long', day: 'numeric'
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

            {/* Hero Image (In-Image реклама появится автоматически через VOX) */}
            <div className="mb-8">
              <img 
                src={post.image || fallback} 
                alt={post.imageAlt || post.title} 
                className="w-full rounded-xl aspect-[16/9] object-cover" 
              />
            </div>

            {/* AD: 728x90 Leaderboard — Desktop only, после заголовка */}
            <div className="hidden xl:block my-6 text-center">
              <UniversalAd 
                placeId={VOX_PLACES.LEADERBOARD} 
                format="728x90" 
                placement="inline" 
              />
            </div>

            {/* Article Content */}
            <ArticleContentWithAd 
              content={post.content ? renderContent(post.content) : (post.contentHtml || '')}
              adsDesktop={[]}
              adsMobile={mobileInContentSidebarAds}
            />

            {/* AD: 320x50 Mobile Banner — мягкий формат перед video slot */}
            <div className="xl:hidden my-6 flex justify-center">
              <UniversalAd
                placeId={VOX_PLACES.MOBILE_BANNER}
                format="320x50"
                placement="mobile"
              />
            </div>

            {/* VIDEO AD: Instream/Outstream slot — в конце статьи */}
            {articleEndVideoPlayer?.enabled && (
              <div className="not-prose my-10">
                <VideoPlayer
                  type={articleEndVideoPlayer.type}
                  position={articleEndVideoPlayer.position}
                  voxPlaceId={articleEndVideoPlayer.voxPlaceId}
                  autoplay={articleEndVideoPlayer.autoplay}
                  muted={articleEndVideoPlayer.muted}
                  videoUrl={process.env.NEXT_PUBLIC_ARTICLE_VIDEO_URL}
                  videoTitle={process.env.NEXT_PUBLIC_ARTICLE_VIDEO_TITLE}
                />
              </div>
            )}
          </article>

          {/* === Sidebar (Desktop only) === */}
          <aside className="xl:sticky xl:top-4 xl:h-fit hidden xl:block space-y-6">
            
            {/* AD: 300x250 Medium Rectangle — sidebar top */}
            <UniversalAd 
              placeId={VOX_PLACES.MEDIUM_RECTANGLE} 
              format="300x250" 
              placement="sidebar" 
            />

            {/* AD: 300x600 Large Skyscraper — sidebar bottom */}
            <UniversalAd 
              placeId={VOX_PLACES.LARGE_SKYSCRAPER} 
              format="300x600" 
              placement="sidebar" 
            />
          </aside>
        </div>

        {/* AD: 970x250 Large Leaderboard — Desktop, перед Related */}
        <div className="hidden xl:block max-w-7xl mx-auto my-12 text-center">
          <UniversalAd 
            placeId={VOX_PLACES.LARGE_LEADERBOARD} 
            format="970x250" 
            placement="inline" 
          />
        </div>

        {/* Related Articles */}
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
