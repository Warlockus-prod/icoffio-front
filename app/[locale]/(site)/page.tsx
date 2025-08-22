import { getAllPosts, getTopPosts, getCategories } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";
import { Hero } from "@/components/Hero";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

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
        'de': '/de',
        'ro': '/ro',
        'cs': '/cs',
      },
    },
  };
}

export const revalidate = 120;

export default async function Page({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  const [hero] = await getTopPosts(1);
  const posts = await getAllPosts(12);
  const cats = await getCategories();

  return (
    <>
      <Container>
        <CategoryNav categories={cats} locale={params.locale} />
      </Container>

      {hero && <Hero post={hero} locale={params.locale} />}

      <Container>
        <section className="py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t.latestNews}</h2>
            <p className="text-neutral-600">{t.mostActualEvents}</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((p) => (
              <ArticleCard key={p.slug} post={p} locale={params.locale} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <button className="px-8 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium">
              {t.showMore}
            </button>
          </div>
        </section>
      </Container>
    </>
  );
}