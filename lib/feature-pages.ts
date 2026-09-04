import type { Post } from './types';

/**
 * Standalone editorial pages that live outside `published_articles` but should
 * appear in listings like any other article. They carry an `href` override, so
 * cards link to their own route instead of `/{locale}/article/{slug}`.
 *
 * Slugs keep the site-wide `-{locale}` suffix so view analytics and the popular
 * articles ranking (which filters on that suffix) treat them as normal posts.
 */

/** Position in the feed. 3 keeps these out of the homepage hero (first 3 posts). */
const FEATURE_INSERT_INDEX = 3;

const LEO_IMAGE =
  'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?q=80&w=1200&auto=format&fit=crop';

const featurePosts: Record<'en' | 'pl', Post> = {
  en: {
    id: 'feature-leo-simulator-en',
    slug: 'leo-simulator-en',
    href: '/en/leo-simulator',
    title: 'LEO Simulator: 27,000 objects circling Earth, live',
    excerpt:
      'LeoLabs tracks every satellite, spent rocket stage and piece of debris in low Earth orbit and publishes it as an interactive 3D globe. We explain what the map shows, where the numbers come from and how to fly it.',
    image: LEO_IMAGE,
    imageAlt: 'A satellite in orbit above Earth',
    category: { name: 'Tech', slug: 'tech' },
    publishedAt: '2026-09-04T09:00:00.000Z',
    date: '2026-09-04T09:00:00.000Z',
    author: 'icoffio Team',
    language: 'en',
    readingTime: 6,
  },
  pl: {
    id: 'feature-leo-simulator-pl',
    slug: 'leo-simulator-pl',
    href: '/pl/leo-simulator',
    title: 'Symulator LEO: 27 000 obiektów krążących wokół Ziemi, na żywo',
    excerpt:
      'LeoLabs śledzi każdego satelitę, zużyty człon rakiety i fragment śmieci na niskiej orbicie i publikuje to jako interaktywny globus 3D. Wyjaśniamy, co pokazuje ta mapa, skąd biorą się liczby i jak nią sterować.',
    image: LEO_IMAGE,
    imageAlt: 'Satelita na orbicie nad Ziemią',
    category: { name: 'Technika', slug: 'tech' },
    publishedAt: '2026-09-04T09:00:00.000Z',
    date: '2026-09-04T09:00:00.000Z',
    author: 'icoffio Team',
    language: 'pl',
    readingTime: 6,
  },
};

export function getFeaturePosts(locale: string): Post[] {
  return [featurePosts[locale === 'pl' ? 'pl' : 'en']];
}

/** Slug used by the standalone page for view tracking. */
export function getFeatureSlug(base: string, locale: string): string {
  return `${base}-${locale === 'pl' ? 'pl' : 'en'}`;
}

/**
 * Splices feature posts into a listing without letting them take the lead
 * position, then trims back to `limit`. Pass `categorySlug` to restrict the
 * insert to features belonging to that category.
 */
export function withFeaturePosts(
  posts: Post[],
  locale: string,
  limit: number,
  categorySlug?: string
): Post[] {
  const features = getFeaturePosts(locale).filter(
    (feature) =>
      (!categorySlug || feature.category.slug === categorySlug) &&
      !posts.some((post) => post.slug === feature.slug)
  );

  if (features.length === 0) return posts.slice(0, limit);

  const merged = [...posts];
  merged.splice(Math.min(FEATURE_INSERT_INDEX, merged.length), 0, ...features);

  return merged.slice(0, limit);
}
