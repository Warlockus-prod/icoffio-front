/**
 * 📰 ARTICLE PAGE - icoffio v7.30.0
 * 
 * Single article display with advertising integration
 * Mock data moved to lib/mock-data.ts for centralization
 */

import { getPostBySlug, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ArticleContentWithAd } from "@/components/ArticleContentWithAd";
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
import { buildSiteUrl } from "@/lib/site-url";
import { normalizeTitleForPublishing } from "@/lib/utils/title-policy";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600; // 1 hour

function isRenderableArticleImage(url: string): boolean {
  const normalized = (url || '').trim();
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  if (/\/photo-1(?:[/?]|$)/i.test(normalized)) return false;
  if (/\/(?:undefined|null|nan)(?:[/?]|$)/i.test(normalized)) return false;
  return true;
}

function extractFirstContentImage(content: string): string {
  if (!content) return '';

  const markdownRegex = /!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/gi;
  let markdownMatch: RegExpExecArray | null = null;
  while ((markdownMatch = markdownRegex.exec(content)) !== null) {
    const markdownUrl = (markdownMatch[1] || '').trim();
    if (isRenderableArticleImage(markdownUrl)) return markdownUrl;
  }

  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let htmlMatch: RegExpExecArray | null = null;
  while ((htmlMatch = htmlRegex.exec(content)) !== null) {
    const htmlUrl = (htmlMatch[1] || '').trim();
    if (isRenderableArticleImage(htmlUrl)) return htmlUrl;
  }

  return '';
}

function normalizePlainText(value: string): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactTitleForUi(value: string, maxChars: number, minChars: number): string {
  const normalized = normalizePlainText(value);
  if (!normalized) return '';

  return normalizeTitleForPublishing(normalized, {
    minLength: minChars,
    maxLength: maxChars,
    fallback: normalized,
  });
}

function isExcerptDuplicateOfTitle(title: string, excerpt: string): boolean {
  const normalizedTitle = normalizePlainText(title).toLowerCase();
  const normalizedExcerpt = normalizePlainText(excerpt).toLowerCase();
  if (!normalizedExcerpt) return true;
  if (normalizedTitle === normalizedExcerpt) return true;

  const excerptPreview = normalizedExcerpt.slice(0, Math.min(90, normalizedExcerpt.length));
  return Boolean(excerptPreview) && normalizedTitle.startsWith(excerptPreview);
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug, params.locale);
  if (!post) return {};

  const publishedTime = new Date(post.publishedAt || post.date || new Date()).toISOString();
  const url = buildSiteUrl(`/${params.locale}/article/${post.slug}`);
  const contentImage = extractFirstContentImage(post.content || post.contentHtml || '');
  const metadataImage = isRenderableArticleImage(post.image || '')
    ? (post.image as string)
    : (contentImage || "/og.png");
  const altLocale = params.locale === 'en' ? 'pl' : 'en';
  const baseSlug = post.slug.replace(/-(en|pl)$/i, '');
  const altSlugCandidate = `${baseSlug}-${altLocale}`;
  const alternatePost = await getPostBySlug(altSlugCandidate, altLocale);
  const alternateUrl = alternatePost
    ? buildSiteUrl(`/${altLocale}/article/${alternatePost.slug}`)
    : null;

  const languageAlternates: Record<string, string> = {
    [params.locale]: url,
  };
  if (alternateUrl) {
    languageAlternates[altLocale] = alternateUrl;
  }
  languageAlternates['x-default'] = languageAlternates.en || url;

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
          url: metadataImage,
          width: 1200,
          height: 630,
          alt: post.imageAlt || post.title,
        },
      ],
      locale: params.locale === 'pl' ? 'pl_PL' : 'en_US',
      alternateLocale: alternateUrl ? [altLocale === 'pl' ? 'pl_PL' : 'en_US'] : undefined,
      type: "article",
      publishedTime,
      section: post.category.name,
      tags: [post.category.name, "technology"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || `${post.title} - detailed article on icoffio`,
      images: [metadataImage],
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
      languages: languageAlternates,
    },
  };
}

export default async function Article({ params }: { params: { locale: string; slug: string } }) {
  const post = await getPostBySlug(params.slug, params.locale);
  if (!post) return notFound();

  const related = await getRelated(post.category, post.slug, 4);

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
  const contentDerivedHero = extractFirstContentImage(cleanArticleContent);
  const heroImage = isRenderableArticleImage(post.image || '')
    ? (post.image as string)
    : (contentDerivedHero || fallback);

  const titleForBreadcrumb = compactTitleForUi(post.title, 72, 34);
  const normalizedExcerpt = normalizePlainText(post.excerpt || '');
  const showExcerpt = normalizedExcerpt && !isExcerptDuplicateOfTitle(post.title, normalizedExcerpt);

  const breadcrumbItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: titleForBreadcrumb, title: post.title }
  ];
  const breadcrumbSchemaItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: post.title }
  ];

  return (
    <>
      <ArticleSchema post={post} locale={params.locale} />
      <BreadcrumbSchema items={breadcrumbSchemaItems} locale={params.locale} />
      
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
              {showExcerpt && (
                <p className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {normalizedExcerpt}
                </p>
              )}
            </header>

            {/* Hero Image */}
            <div className="mb-8">
              <img 
                src={heroImage} 
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
              <div key={ad.id} className="xl:hidden">
                <UniversalAd
                  placeId={ad.placeId}
                  format={ad.format}
                  placement={ad.placement}
                  enabled={ad.enabled}
                />
              </div>
            ))}

            {/* Content bottom ads - Desktop */}
            {adsContentBottomDesktop.map((ad) => (
              <div key={ad.id} className="hidden xl:block">
                <UniversalAd
                  placeId={ad.placeId}
                  format={ad.format}
                  placement={ad.placement}
                  enabled={ad.enabled}
                />
              </div>
            ))}
            
            {/* Content bottom ads - Mobile */}
            {adsContentBottomMobile.map((ad) => (
              <div key={ad.id} className="xl:hidden">
                <UniversalAd
                  placeId={ad.placeId}
                  format={ad.format}
                  placement={ad.placement}
                  enabled={ad.enabled}
                />
              </div>
            ))}

            {/* Instream Video Player - Article End */}
            {articleInstreamPlayers
              .filter(p => p.position === 'article-end')
              .map((player) => (
                <VideoPlayer
                  key={player.id}
                  type={player.type}
                  position={player.position}
                  videoUrl={player.videoUrl}
                  videoPlaylist={player.videoPlaylist}
                  adTagUrl={player.adTagUrl}
                  adTagPlaylist={player.adTagPlaylist}
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
                  videoUrl={player.videoUrl}
                  videoPlaylist={player.videoPlaylist}
                  adTagUrl={player.adTagUrl}
                  adTagPlaylist={player.adTagPlaylist}
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
          <div key={ad.id} className="max-w-7xl mx-auto mt-12 hidden xl:block">
            <UniversalAd
              placeId={ad.placeId}
              format={ad.format}
              placement={ad.placement}
              enabled={ad.enabled}
            />
          </div>
        ))}
        
        {/* Footer ads - Mobile */}
        {adsFooterMobile.map((ad) => (
          <div key={ad.id} className="max-w-7xl mx-auto mt-12 xl:hidden">
            <UniversalAd
              placeId={ad.placeId}
              format={ad.format}
              placement={ad.placement}
              enabled={ad.enabled}
            />
          </div>
        ))}

        {/* Related Articles - Full Width */}
        <div className="mt-16">
          <RelatedArticles 
            posts={related}
            locale={params.locale}
            currentPostSlug={post.slug}
            currentPost={post}
          />
        </div>
      </Container>
    </>
  );
}
