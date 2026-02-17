import { getAllPosts, getCategories } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { getTranslation } from "@/lib/i18n";
import { getSiteBaseUrl } from "@/lib/site-url";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  const siteUrl = getSiteBaseUrl();
  const url = `${siteUrl}/${params.locale}/articles`;
  const languageAlternates: Record<string, string> = {
    en: `${siteUrl}/en/articles`,
    pl: `${siteUrl}/pl/articles`,
    "x-default": `${siteUrl}/en/articles`,
  };

  return {
    title: `${t.articles} | ${t.siteTitle}`,
    description: t.siteDescription,
    keywords: "articles, technology, gadgets, Apple, AI, games, news",
    alternates: {
      canonical: url,
      languages: languageAlternates,
    },
    openGraph: {
      title: `${t.articles} | icoffio`,
      description: t.siteDescription,
      url,
      siteName: "icoffio",
      type: "website",
      locale: params.locale === "pl" ? "pl_PL" : "en_US",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "icoffio",
        },
      ],
    },
  };
}

export default async function ArticlesPage({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);

  const [allPosts, cats] = await Promise.all([
    getAllPosts(48, params.locale),
    getCategories(params.locale),
  ]);

  const breadcrumbs = [
    { label: t.articles, href: `/${params.locale}/articles` },
  ];

  return (
    <Container>
      <Breadcrumbs items={breadcrumbs} locale={params.locale} />

      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold text-neutral-900 dark:text-neutral-100">
          {t.articles}
        </h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-300">{t.mostActualEvents}</p>
      </div>

      <CategoryNav categories={cats} locale={params.locale} />

      <section className="py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allPosts.map((post) => (
            <ArticleCard key={post.slug} post={post} locale={params.locale} />
          ))}
        </div>

        {allPosts.length === 0 && (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📝</div>
            <h3 className="mb-2 text-xl font-semibold text-neutral-700 dark:text-neutral-300">
              No articles yet
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Interesting content coming soon
            </p>
          </div>
        )}

        {allPosts.length > 0 && (
          <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Showing {allPosts.length} {allPosts.length === 1 ? 'article' : 'articles'}
          </div>
        )}
      </section>
    </Container>
  );
}
