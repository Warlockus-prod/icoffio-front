import { getAllPosts, getTopPosts, getCategories } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";
import { Hero } from "@/components/Hero";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "icoffio — гаджеты, технологии и многое другое",
  description: "Рассказываем о важных событиях в мире технологий. Новости, обзоры и статьи об Apple, ИИ, играх и новых технологиях.",
  keywords: "технологии, гаджеты, Apple, iPhone, AI, игры, новости, обзоры",
  authors: [{ name: "icoffio Team" }],
  openGraph: {
    title: "icoffio — технологический медиа",
    description: "Самые актуальные новости и обзоры из мира технологий",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: "icoffio",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "icoffio - технологии и гаджеты",
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "icoffio — технологии и гаджеты", 
    description: "Актуальные новости из мира технологий",
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
  },
};

export const revalidate = 120;

export default async function Page() {
  const [hero] = await getTopPosts(1);
  const posts = await getAllPosts(12);
  const cats = await getCategories();

  return (
    <>
      <Container>
        <CategoryNav categories={cats} />
      </Container>

      {hero && <Hero post={hero} />}

      <Container>
        <section className="py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Последние новости</h2>
            <p className="text-neutral-600">Самые актуальные события из мира технологий</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <button className="px-8 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium">
              Показать больше
            </button>
          </div>
        </section>
      </Container>
    </>
  );
}
