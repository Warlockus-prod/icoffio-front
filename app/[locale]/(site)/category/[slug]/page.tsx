import { getCategoryBySlug, getPostsByCategory, getCategorySlugs } from "@/lib/data";
import { Container } from "@/components/Container";
import { ArticleCard } from "@/components/ArticleCard";
import { notFound } from "next/navigation";

export const revalidate = 120;

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return notFound();
  const posts = await getPostsByCategory(category.slug, 24);

  return (
    <Container>
      <h1 className="text-2xl font-extrabold mb-6">{category.name}</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((p) => (
          <ArticleCard key={p.slug} post={p} />
        ))}
      </div>
    </Container>
  );
}
