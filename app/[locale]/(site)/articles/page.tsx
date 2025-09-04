import { getAllPosts, getCategories } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { getTranslation } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: `${t.articles} | ${t.siteTitle}`,
    description: t.siteDescription,
    keywords: "articles, technology, gadgets, Apple, AI, games, news",
  };
}

export default async function ArticlesPage({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  
  try {
    const [allPosts, cats] = await Promise.all([
      getAllPosts(48, params.locale), // Больше статей для страницы
      getCategories()
    ]);

    const breadcrumbs = [
      { label: t.articles, href: `/${params.locale}/articles` }
    ];

    return (
      <Container>
        <Breadcrumbs items={breadcrumbs} locale={params.locale} />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {t.articles}
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-300">
            {t.mostActualEvents}
          </p>
        </div>

        <CategoryNav categories={cats} locale={params.locale} />

        <section className="py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts.map((post) => (
              <ArticleCard key={post.slug} post={post} locale={params.locale} />
            ))}
          </div>

          {allPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Статей пока нет
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Скоро здесь появятся интересные материалы
              </p>
            </div>
          )}
        </section>
      </Container>
    );
  } catch (error) {
    console.error('Error loading articles:', error);
    
    return (
      <Container>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Ошибка загрузки статей
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Попробуйте обновить страницу
          </p>
        </div>
      </Container>
    );
  }
}
