import Link from "next/link";
import type { Post } from "@/lib/types";

export function ArticleCard({ post, locale = 'en' }: { post: Post; locale?: string }) {
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";
  const img = post.image || fallback;
  
  return (
    <Link href={`/${locale}/article/${post.slug}`} className="group rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors">
      <div className="aspect-[16/10] overflow-hidden">
        <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">{post.category.name}</div>
        <h3 className="mt-1 text-[17px] font-semibold leading-snug line-clamp-2">{post.title}</h3>
        <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{post.excerpt}</p>
      </div>
    </Link>
  );
}
