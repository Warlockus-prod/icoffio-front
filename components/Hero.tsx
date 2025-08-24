import Link from "next/link";
import { Container } from "./Container";
import { getTranslation } from "@/lib/i18n";
import type { Post } from "@/lib/types";

interface HeroProps {
  posts: Post[];
  locale?: string;
}

export function Hero({ posts, locale = 'en' }: HeroProps) {
  const t = getTranslation(locale as any);
  
  if (!posts || posts.length < 3) {
    return null; // Показываем Hero только если есть минимум 3 статьи
  }

  const [main, ...rest] = posts.slice(0, 3); // Берем первые 3 статьи

  const getImage = (post: Post) => {
    const fallbacks = [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop"
    ];
    return post.image || fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  return (
    <Container>
      <section className="py-8 grid md:grid-cols-3 gap-6">
        {/* Main Article - 2 columns */}
        <Link href={`/${locale}/article/${main.slug}`} className="group col-span-2 block">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100">
            <img 
              src={getImage(main)} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
            />
          </div>
          <div className="mt-3">
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {main.category.name}
            </span>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {main.title}
            </h2>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {main.excerpt || t.mostActualEvents}
            </p>
          </div>
        </Link>

        {/* Secondary Articles - 1 column */}
        <div className="flex flex-col gap-6">
          {rest.map((post, index) => (
            <Link key={post.slug} href={`/${locale}/article/${post.slug}`} className="group block">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-neutral-100">
                <img 
                  src={getImage(post)} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" 
                />
              </div>
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  {post.category.name}
                </span>
                <h3 className="mt-1 text-lg font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
