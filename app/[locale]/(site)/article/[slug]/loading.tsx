import { Container } from "@/components/Container";
import { ArticlePageSkeleton, ArticleCardSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <Container>
      <ArticlePageSkeleton />

      {/* Related articles skeleton */}
      <section className="mt-16 border-t border-neutral-200 dark:border-neutral-800 pt-12">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-8"></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </Container>
  );
}




