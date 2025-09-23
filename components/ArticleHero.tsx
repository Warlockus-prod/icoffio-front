import Link from "next/link";
import type { Post } from "@/lib/types";

export function ArticleHero({ post, locale }: { post: Post; locale: string }) {
  return (
    <Link href={`/article/${post.slug}`} className="group grid md:grid-cols-2 gap-6 py-8">
      <div className="order-2 md:order-1">
        <div className="text-xs uppercase tracking-wider text-neutral-500">{post.category.name}</div>
        <h2 className="mt-2 text-3xl/tight font-extrabold group-hover:underline">
          {post.title}
        </h2>
        <p className="mt-2 text-neutral-700 max-w-prose">{post.excerpt}</p>
        <div className="mt-4 text-sm text-neutral-500">{new Date(post.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'pl-PL', {
          day: 'numeric',
          month: 'long', 
          year: 'numeric'
        })}</div>
      </div>
      <div className="order-1 md:order-2 rounded-2xl overflow-hidden">
        <img src={post.image} alt={post.imageAlt || post.title} className="w-full h-full object-cover" />
      </div>
    </Link>
  );
}
