import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";

export function ArticleHero({ post, locale }: { post: Post; locale: string }) {
  return (
    <Link href={`/${locale}/article/${post.slug}`} className="group grid md:grid-cols-2 gap-6 py-8">
      <div className="order-2 md:order-1">
        <div className="text-xs uppercase tracking-wider text-neutral-500">{post.category.name}</div>
        <h2 className="mt-2 text-3xl/tight font-extrabold group-hover:underline">
          {post.title}
        </h2>
        <p className="mt-2 text-neutral-700 max-w-prose">{post.excerpt}</p>
        <div className="mt-4 text-sm text-neutral-500">{new Date(post.publishedAt || post.date || new Date()).toLocaleDateString(locale === 'en' ? 'en-US' : 'pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}</div>
      </div>
      <div className="order-1 md:order-2 rounded-2xl overflow-hidden relative aspect-[16/9]">
        <Image
          src={post.image}
          alt={post.imageAlt || post.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </Link>
  );
}
