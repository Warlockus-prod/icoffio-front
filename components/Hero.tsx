import Link from "next/link";
import { Container } from "./Container";
import type { Post } from "@/lib/types";

interface HeroProps {
  post: Post;
  locale?: string;
}

export function Hero({ post, locale = 'en' }: HeroProps) {
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";
  const img = post.image || fallback;

  return (
    <section className="bg-gradient-to-br from-neutral-50 to-white border-b border-neutral-200">
      <Container>
        <div className="py-12 md:py-16">
          <Link href={`/${locale}/article/${post.slug}`} className="group block">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {post.category.name}
                  </span>
                  <span className="text-neutral-500 text-sm">5 мин чтения</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 group-hover:text-blue-600 transition-colors leading-tight">
                  {post.title}
                </h1>
                
                <p className="text-lg text-neutral-600 leading-relaxed">
                  {post.excerpt || "Полный обзор важных событий в мире технологий. Узнайте обо всех новинках и трендах первыми."}
                </p>
              </div>

              <div className="order-1 md:order-2">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100">
                  <img 
                    src={img} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </Container>
    </section>
  );
}
