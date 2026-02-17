import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/data';
import { getSiteBaseUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const locales = ['en', 'pl'];
  const categories = ['ai', 'apple', 'digital', 'tech', 'games', 'news-2'];
  const localeHome = Object.fromEntries(locales.map((locale) => [locale, `${base}/${locale}`]));

  const routes: MetadataRoute.Sitemap = [];

  // ── Homepage ──
  routes.push({
    url: base,
    priority: 1,
    changeFrequency: 'daily',
    alternates: {
      languages: {
        ...localeHome,
        'x-default': `${base}/en`,
      },
    },
  });

  locales.forEach(locale => {
    routes.push({
      url: `${base}/${locale}`,
      priority: 0.9,
      changeFrequency: 'daily',
      alternates: {
        languages: {
          ...localeHome,
          'x-default': `${base}/en`,
        },
      },
    });
  });

  // ── Static pages ──
  const staticPages = ['articles', 'editorial', 'advertising', 'privacy', 'cookies'];
  locales.forEach(locale => {
    staticPages.forEach(page => {
      routes.push({
        url: `${base}/${locale}/${page}`,
        priority: 0.6,
        changeFrequency: 'monthly',
        alternates: {
          languages: {
            ...Object.fromEntries(locales.map((l) => [l, `${base}/${l}/${page}`])),
            'x-default': `${base}/en/${page}`,
          },
        },
      });
    });
  });

  // ── Category pages ──
  locales.forEach(locale => {
    categories.forEach(category => {
      routes.push({
        url: `${base}/${locale}/category/${category}`,
        priority: 0.8,
        changeFrequency: 'weekly',
        alternates: {
          languages: {
            ...Object.fromEntries(locales.map((l) => [l, `${base}/${l}/category/${category}`])),
            'x-default': `${base}/en/category/${category}`,
          },
        },
      });
    });
  });

  const postsByLocale = new Map<string, Awaited<ReturnType<typeof getAllPosts>>>();
  await Promise.all(
    locales.map(async (locale) => {
      try {
        const posts = await getAllPosts(300, locale);
        postsByLocale.set(locale, posts);
      } catch (error) {
        console.warn(`Sitemap: could not fetch posts for ${locale}:`, error);
        postsByLocale.set(locale, []);
      }
    })
  );

  const slugSetByLocale = new Map<string, Set<string>>();
  locales.forEach((locale) => {
    const posts = postsByLocale.get(locale) || [];
    slugSetByLocale.set(
      locale,
      new Set(posts.map((post) => post.slug).filter(Boolean))
    );
  });

  // ── Article pages ──
  for (const locale of locales) {
    try {
      const posts = postsByLocale.get(locale) || [];
      for (const post of posts) {
        const baseSlug = post.slug.replace(/-en$/, '').replace(/-pl$/, '');
        const altLocale = locale === 'en' ? 'pl' : 'en';
        const altSlug = `${baseSlug}-${altLocale}`;
        const enSlug = `${baseSlug}-en`;
        const localizedUrl = `${base}/${locale}/article/${post.slug}`;
        const altExists = slugSetByLocale.get(altLocale)?.has(altSlug);
        const enExists = slugSetByLocale.get('en')?.has(enSlug);

        const languageAlternates: Record<string, string> = {
          [locale]: localizedUrl,
          'x-default': enExists ? `${base}/en/article/${enSlug}` : localizedUrl,
        };
        if (altExists) {
          languageAlternates[altLocale] = `${base}/${altLocale}/article/${altSlug}`;
        }

        routes.push({
          url: localizedUrl,
          priority: 0.7,
          changeFrequency: 'monthly',
          lastModified: new Date(post.publishedAt || post.date || new Date()),
          alternates: {
            languages: languageAlternates,
          },
        });
      }
    } catch (error) {
      console.warn(`Sitemap: could not fetch posts for ${locale}:`, error);
    }
  }

  return routes;
}
