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
  
  let allPosts: any[] = [];
  let cats: any[] = [];
  let hasError = false;

  try {
    // Try to load data from GraphQL
    const [graphqlPosts, graphqlCats] = await Promise.all([
      getAllPosts(48, params.locale),
      getCategories(params.locale)
    ]);
    
    allPosts = graphqlPosts;
    cats = graphqlCats;
  } catch (error) {
    console.error('Error loading from GraphQL, using fallback:', error);
    hasError = true;
    
    // Fallback: use local articles and categories
    try {
      const [localPosts, localCats] = await Promise.all([
        getAllPosts(48, params.locale), // This function includes fallback to local articles
        getCategories(params.locale) // This function also includes local categories
      ]);
      
      allPosts = localPosts;
      cats = localCats;
    } catch (fallbackError) {
      console.error('Error loading fallback data:', fallbackError);
      // Use mocks as last resort
      allPosts = [];
      cats = [
        { name: "Artificial Intelligence", slug: "ai" },
        { name: "Apple", slug: "apple" },
        { name: "Technology", slug: "tech" },
        { name: "Games", slug: "games" },
        { name: "Digital", slug: "digital" },
        { name: "News", slug: "news-2" }
      ];
    }
  }

  const breadcrumbs = [
    { label: t.articles, href: `/${params.locale}/articles` }
  ];

  return (
    <Container>
      <Breadcrumbs items={breadcrumbs} locale={params.locale} />
      
      {/* Show warning if there are issues with the main source */}
      {hasError && allPosts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <div className="text-lg">⚠️</div>
            <p className="text-sm">
              Using local version of articles. Some articles may be unavailable.
            </p>
          </div>
        </div>
      )}
      
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
              {hasError ? "Problem loading articles" : "No articles yet"}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {hasError ? "Try refreshing the page or come back later" : "Interesting content coming soon"}
            </p>
            {hasError && (
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            )}
          </div>
        )}

        {/* Show number of loaded articles */}
        {allPosts.length > 0 && (
          <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Showing {allPosts.length} {allPosts.length === 1 ? 'article' : 'articles'}
          </div>
        )}
      </section>
    </Container>
  );
}

