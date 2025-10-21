import { getPostBySlug, getAllSlugs, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import { SearchModalWrapper } from "@/components/SearchModalWrapper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BackButton } from "@/components/BackButton";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleSchema, BreadcrumbSchema } from "@/components/StructuredData";
import { InlineAd } from "@/components/InlineAd";
import { SidebarAd } from "@/components/SidebarAd";
import { UniversalAd } from "@/components/UniversalAd";
import Link from "next/link";
import type { Metadata } from "next";
import type { Post } from "@/lib/types";

export const revalidate = 120;

// MOCK ДАННЫЕ - качественные статьи для fallback
const mockPosts: Post[] = [
  {
    id: "1",
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Apple Vision Pro headset",
    category: { name: "Apple", slug: "apple" },
    tags: [],
    images: [],
    publishedAt: "2025-01-13T10:00:00Z",
    content: `<h2>Revolutionary Technology</h2><p>Apple Vision Pro represents a fundamental shift in computing...</p>`
  }
];

// Функция для поиска поста по slug в mock данных
function getPostBySlugFromMocks(slug: string): Post | null {
  return mockPosts.find(post => post.slug === slug) || null;
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  let post: Post | null = null;
  
  try {
    post = await getPostBySlug(params.slug, params.locale);
  } catch (error) {
    console.error('GraphQL Error in metadata, using mock:', error);
  }
  
  if (!post) {
    post = getPostBySlugFromMocks(params.slug);
  }
  
  if (!post) {
    return {
      title: "icoffio - Tech News",
      description: "Latest technology news and insights"
    };
  }

  return {
    title: post.title,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: [{ url: post.image || "/og.png" }],
    },
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
  }
  
  if (!post) return notFound();
  
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  const breadcrumbItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: post.title }
  ];

  return (
    <>
      <ArticleSchema post={post} locale={params.locale} />
      <BreadcrumbSchema items={breadcrumbItems} locale={params.locale} />
      
      <Container>
        <div className="flex items-center justify-between mb-4">
          <BackButton locale={params.locale} />
        </div>
        <Breadcrumbs items={breadcrumbItems} locale={params.locale} />

        {/* Main Content Grid: Article + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 max-w-7xl mx-auto">
          
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

                  {/* VOX Display реклама - 728x90 Leaderboard после заголовка */}
                  <InlineAd 
                    placeId="63da9b577bc72f39bc3bfc68" 
                    format="728x90" 
                    className="mb-6"
                  />

            {/* VOX Display реклама - 320x50 Mobile Banner (новый PlaceID) */}
            <div className="block lg:hidden">
              <UniversalAd 
                placeId="68f644dc70e7b26b58596f34" 
                format="320x50" 
                className="mb-4"
              />
            </div>

            <div className="mb-8">
              <img 
                src={post.image || fallback} 
                alt={post.imageAlt || post.title} 
                className="w-full rounded-xl aspect-[16/9] object-cover" 
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
              {post.content ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : post.contentHtml ? (
                <Prose html={post.contentHtml} />
              ) : (
                <p className="text-neutral-600 dark:text-neutral-300">Content not available.</p>
              )}
            </div>

            {/* VOX Display реклама - 320x100 Large Mobile Banner (новый PlaceID) */}
            <div className="block lg:hidden">
              <UniversalAd 
                placeId="68f645bf810d98e1a08f272f" 
                format="320x100" 
                className="my-6"
              />
            </div>

            {/* VOX Display реклама - 320x480 Mobile Large (новый PlaceID) */}
            <UniversalAd 
              placeId="68f63437810d98e1a08f26de" 
              format="320x480" 
              className="mt-6"
            />

            {/* VOX Display реклама - 970x250 Large Leaderboard в конце */}
            <InlineAd 
              placeId="63daa3c24d506e16acfd2a38" 
              format="970x250" 
              className="mt-8"
            />

          </article>

          {/* Sidebar с рекламой */}
          <aside className="lg:sticky lg:top-4 lg:h-fit space-y-6">
            
            {/* VOX Display реклама - 300x250 Medium Rectangle сверху */}
            <SidebarAd 
              placeId="63da9e2a4d506e16acfd2a36" 
              format="300x250" 
            />

            {/* VOX Display реклама - 160x600 Wide Skyscraper (новый PlaceID) */}
            <div className="hidden lg:block">
              <UniversalAd 
                placeId="68f6451d810d98e1a08f2725" 
                format="160x600" 
                className="my-6"
              />
            </div>

            {/* VOX Display реклама - 300x600 Large Skyscraper снизу */}
            <SidebarAd 
              placeId="63daa2ea7bc72f39bc3bfc72" 
              format="300x600" 
            />
            
          </aside>
        </div>

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

      <SearchModalWrapper posts={mockPosts} locale={params.locale} />
    </>
  );
}