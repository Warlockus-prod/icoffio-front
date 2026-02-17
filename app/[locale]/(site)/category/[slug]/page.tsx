import { getCategoryBySlug, getPostsByCategory } from "@/lib/data";
import { Container } from "@/components/Container";
import { ArticleCard } from "@/components/ArticleCard";
import { notFound } from "next/navigation";
import { getTranslation } from "@/lib/i18n";
import { getSiteBaseUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug, params.locale);
  const t = getTranslation(params.locale as any);
  const siteUrl = getSiteBaseUrl();
  const url = `${siteUrl}/${params.locale}/category/${params.slug}`;
  const languageAlternates: Record<string, string> = {
    en: `${siteUrl}/en/category/${params.slug}`,
    pl: `${siteUrl}/pl/category/${params.slug}`,
    "x-default": `${siteUrl}/en/category/${params.slug}`,
  };

  if (!category) {
    return {
      title: `Category | ${t.siteTitle}`,
      robots: { index: false, follow: false },
    };
  }

  const description = params.locale === "pl"
    ? `Najnowsze artykuly w kategorii ${category.name} na icoffio.`
    : `Latest ${category.name} articles on icoffio.`;

  return {
    title: `${category.name} | ${t.siteTitle}`,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates,
    },
    openGraph: {
      title: `${category.name} | icoffio`,
      description,
      url,
      siteName: "icoffio",
      type: "website",
      locale: params.locale === "pl" ? "pl_PL" : "en_US",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${category.name} - icoffio`,
        },
      ],
    },
  };
}

export default async function CategoryPage({ params }: { params: { locale: string; slug: string } }) {
  const [category, posts] = await Promise.all([
    getCategoryBySlug(params.slug, params.locale),
    getPostsByCategory(params.slug, 24, params.locale),
  ]);

  if (!category) {
    return notFound();
  }

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-extrabold">{category.name}</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <ArticleCard key={post.slug} post={post} locale={params.locale} />
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              No articles found in this category yet.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
