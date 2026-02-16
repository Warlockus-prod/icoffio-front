import { getCategoryBySlug, getPostsByCategory } from "@/lib/data";
import { Container } from "@/components/Container";
import { ArticleCard } from "@/components/ArticleCard";
import { notFound } from "next/navigation";

export const revalidate = 300;

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
