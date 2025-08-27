import { Container } from "@/components/Container";
import { ArticleCardSkeleton, HeroPostSkeleton, SidePostSkeleton, CategoryNavSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <>
      <Container>
        <CategoryNavSkeleton />
      </Container>

      {/* Hero section skeleton */}
      <Container>
        <section className="py-8 grid md:grid-cols-3 gap-6">
          <HeroPostSkeleton />
          
          <div className="flex flex-col gap-6">
            <SidePostSkeleton />
            <SidePostSkeleton />
          </div>
        </section>
      </Container>

      {/* Articles grid skeleton */}
      <div className="mx-auto max-w-6xl px-4">
        <section className="py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-96 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="h-12 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse mx-auto"></div>
          </div>
        </section>
      </div>
    </>
  );
}
