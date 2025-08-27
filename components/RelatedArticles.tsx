import Link from 'next/link';
import type { Post } from '@/lib/types';
import { getTranslation } from '@/lib/i18n';

interface RelatedArticlesProps {
  posts: Post[];
  locale: string;
  currentPostSlug?: string;
}

export function RelatedArticles({ posts, locale, currentPostSlug }: RelatedArticlesProps) {
  const t = getTranslation(locale);
  
  // Filter out current post and take first 3
  const relatedPosts = posts
    .filter(post => post.slug !== currentPostSlug)
    .slice(0, 3);

  if (relatedPosts.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        {t.relatedArticles}
      </h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {relatedPosts.map((post) => (
          <article key={post.slug} className="group">
            <Link 
              href={`/${locale}/article/${post.slug}`}
              className="block rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-sm transition-shadow"
            >
              <div className="aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                {post.image && (
                  <img
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                )}
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {post.category.name}
                  </span>
                  {post.publishedAt && (
                    <time>
                      {new Date(post.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : locale === 'ro' ? 'ro-RO' : 'cs-CZ', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                  )}
                </div>
                
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                
                {post.excerpt && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
