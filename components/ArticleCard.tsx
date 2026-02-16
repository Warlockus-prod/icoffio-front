import type { Post } from "@/lib/types";
import { OptimizedImage } from "./OptimizedImage";
import { getTranslation } from "@/lib/i18n";

export function ArticleCard({ post, locale = 'en' }: { post: Post; locale?: string }) {
  const t = getTranslation(locale);
  
  // Large collection of diverse fallback images to ensure uniqueness
  const fallbacks = [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop", // Circuit board tech
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop", // AI/Robot blue
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop", // iPhone close-up
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop", // Laptop coding
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop", // Gaming setup
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop", // MacBook workspace
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop", // Data visualization
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop", // Digital globe
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop", // Abstract tech lines
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop", // Matrix code
    "https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=800&auto=format&fit=crop", // Server room
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=800&auto=format&fit=crop", // Laptop desk setup
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop", // Team coding
    "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800&auto=format&fit=crop", // Code on screen
    "https://images.unsplash.com/photo-1486312338219-ce68e2c6b8c4?q=80&w=800&auto=format&fit=crop", // Laptop side view
    "https://images.unsplash.com/photo-1551808525-51a94da548ce?q=80&w=800&auto=format&fit=crop", // MacBook air
    "https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=800&auto=format&fit=crop", // VR headset
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?q=80&w=800&auto=format&fit=crop", // Cyberpunk city
    "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=800&auto=format&fit=crop", // Gaming keyboard
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop", // Abstract circuit
  ];
  
  // Use category + slug for better distribution and avoid duplicates
  const seedString = `${post.category.name}-${post.slug}-${post.title.slice(0, 5)}`;
  const hashCode = seedString.split('').reduce((hash, char, index) => {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash = hash & hash; // Convert to 32-bit integer
    return Math.abs(hash) + index * 7; // Better distribution
  }, 5381); // DJB2 hash initial value
  
  const fallbackIndex = hashCode % fallbacks.length;
  const fallback = fallbacks[fallbackIndex];
  
  const img = post.image || fallback;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <article
      className="group rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-800/50 transition-all duration-300"
      data-article-card="1"
      data-no-inimage="1"
    >
      <a href={`/${locale}/article/${post.slug}`} className="block">
        <div className="aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <OptimizedImage
            src={img}
            alt={post.imageAlt || post.title}
            width={400}
            height={225}
            className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={80}
          />
        </div>
      </a>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-300">
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-200 font-medium">
            {post.category.name}
          </span>
          <time>{formatDate(post.publishedAt || post.date || '')}</time>
        </div>
        
        <a href={`/${locale}/article/${post.slug}`}>
          <h3 className="text-[18px] font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {post.title}
          </h3>
        </a>
        
        <p className="text-sm text-neutral-600 dark:text-neutral-200 line-clamp-3 leading-relaxed">
          {post.excerpt}
        </p>
        
        {/* Кнопка "Читать далее" */}
        <div className="pt-2">
          <a
            href={`/${locale}/article/${post.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 group/link"
          >
            <span>{t.readMore}</span>
            <svg
              className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
