import Link from 'next/link';
import type { Post } from '@/lib/types';
import { getTranslation } from '@/lib/i18n';

interface RelatedArticlesProps {
  posts: Post[];
  locale: string;
  currentPostSlug?: string;
  currentPost?: Post; // Добавляем для лучших рекомендаций
}

export function RelatedArticles({ posts, locale, currentPostSlug, currentPost }: RelatedArticlesProps) {
  const t = getTranslation(locale);
  
  // Умный алгоритм рекомендаций на основе тегов и категории
  const getSmartRecommendations = (allPosts: Post[], current?: Post): Post[] => {
    if (!current) {
      // Fallback: просто фильтруем текущий пост
      return allPosts.filter(post => post.slug !== currentPostSlug).slice(0, 3);
    }

    const scoredPosts = allPosts
      .filter(post => post.slug !== currentPostSlug)
      .map(post => {
        let score = 0;
        
        // Бонус за совпадение категории
        if (post.category.slug === current.category.slug) {
          score += 3;
        }
        
        // Бонус за совпадающие теги
        if (current.tags && post.tags) {
          const currentTagSlugs = current.tags.map(tag => tag.slug);
          const postTagSlugs = post.tags.map(tag => tag.slug);
          const commonTags = currentTagSlugs.filter(slug => postTagSlugs.includes(slug));
          score += commonTags.length * 2; // 2 балла за каждый общий тег
        }
        
        // Небольшой бонус за новизну (более новые статьи)
        if (post.publishedAt) {
          const postDate = new Date(post.publishedAt);
          const currentDate = new Date(current.publishedAt);
          const daysDifference = Math.abs((currentDate.getTime() - postDate.getTime()) / (1000 * 3600 * 24));
          if (daysDifference < 7) score += 1; // Бонус за статьи в пределах недели
        }
        
        return { ...post, relevanceScore: score };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore) // Сортируем по релевантности
      .slice(0, 3);

    return scoredPosts;
  };

  const relatedPosts = getSmartRecommendations(posts, currentPost);

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
                  {/* Индикатор релевантности для дебага */}
                  {(post as any).relevanceScore > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      {(post as any).relevanceScore}
                    </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                
                {/* Показать общие теги с текущим постом */}
                {currentPost?.tags && post.tags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {post.tags
                      .filter(tag => currentPost.tags?.some(currentTag => currentTag.slug === tag.slug))
                      .slice(0, 2)
                      .map(tag => (
                        <span 
                          key={tag.slug}
                          className="px-1.5 py-0.5 text-xs rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                        >
                          {tag.name}
                        </span>
                      ))}
                  </div>
                )}
                
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
