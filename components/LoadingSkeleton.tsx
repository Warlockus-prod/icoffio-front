interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${className}`} />
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="group rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      {/* Image skeleton */}
      <Skeleton className="aspect-[16/9] w-full" />
      
      <div className="p-4">
        {/* Category and date row */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        {/* Title skeleton - 2 lines */}
        <div className="space-y-2 mb-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        
        {/* Excerpt skeleton - 2 lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function HeroPostSkeleton() {
  return (
    <div className="col-span-2 block">
      {/* Large image skeleton */}
      <Skeleton className="aspect-[16/9] w-full rounded-2xl mb-3" />
      
      <div>
        {/* Category skeleton */}
        <Skeleton className="h-6 w-20 mb-2" />
        
        {/* Title skeleton - 3 lines */}
        <div className="space-y-2 mb-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        
        {/* Excerpt skeleton - 2 lines */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function SidePostSkeleton() {
  return (
    <div className="block">
      {/* Medium image skeleton */}
      <Skeleton className="aspect-[16/9] w-full rounded-xl mb-2" />
      
      <div>
        {/* Category skeleton */}
        <Skeleton className="h-5 w-16 mb-1" />
        
        {/* Title skeleton - 2 lines */}
        <div className="space-y-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function CategoryNavSkeleton() {
  return (
    <nav className="flex gap-3 overflow-x-auto py-4 no-scrollbar">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="shrink-0 h-8 w-16 rounded-full" />
      ))}
    </nav>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="flex gap-4 p-3 rounded-xl">
      {/* Small image skeleton */}
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {/* Title skeleton */}
        <div className="space-y-1 mb-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Excerpt skeleton */}
        <Skeleton className="h-3 w-full mb-2" />
        
        {/* Category and date */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ArticlePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs skeleton */}
      <div className="mb-6 flex items-center space-x-2">
        <Skeleton className="h-4 w-12" />
        <div className="w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <div className="w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      {/* Header */}
      <header className="mb-8">
        {/* Category and date */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Title skeleton */}
        <div className="space-y-3 mb-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
        </div>
        
        {/* Excerpt skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
        </div>
      </header>

      {/* Main image */}
      <Skeleton className="w-full aspect-[16/9] rounded-xl mb-8" />

      {/* Content skeleton */}
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}








