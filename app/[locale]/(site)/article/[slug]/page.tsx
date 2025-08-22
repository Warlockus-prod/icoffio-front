import { getPostBySlug, getAllSlugs, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};

  const publishedTime = new Date(post.date).toISOString();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/article/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt || `${post.title} - подробный материал на icoffio`,
    keywords: `${post.category.name}, технологии, ${post.title}`,
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: post.title,
      description: post.excerpt || `${post.title} - подробный материал на icoffio`,
      url,
      siteName: "icoffio",
      images: [
        {
          url: post.image || "/og.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: "ru_RU",
      type: "article",
      publishedTime,
      section: post.category.name,
      tags: [post.category.name, "технологии"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || `${post.title} - подробный материал на icoffio`,
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

export default async function Article({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return notFound();
  const related = await getRelated(post.category, post.slug, 4);
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  return (
    <Container>
      <article className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link 
              href={`/category/${post.category.slug}`} 
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full hover:bg-blue-200 transition-colors"
            >
              {post.category.name}
            </Link>
            <time 
              dateTime={post.date} 
              className="text-sm text-neutral-500"
            >
              {new Date(post.date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-neutral-900 leading-tight">
            {post.title}
          </h1>
        </header>

        <div className="mb-8">
          <img 
            src={post.image || fallback} 
            alt={post.title} 
            className="w-full rounded-xl aspect-[16/9] object-cover" 
          />
        </div>

        <div className="prose prose-neutral prose-lg max-w-none">
          <Prose html={post.contentHtml} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-16 border-t border-neutral-200 pt-12">
          <h2 className="text-2xl font-bold mb-8 text-neutral-900">Читайте также</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <Link key={p.slug} href={`/article/${p.slug}`} className="group block">
                <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white hover:shadow-lg transition-shadow">
                  <img 
                    src={p.image || fallback} 
                    alt={p.title} 
                    className="aspect-[16/10] w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                      {p.category.name}
                    </div>
                    <div className="font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}