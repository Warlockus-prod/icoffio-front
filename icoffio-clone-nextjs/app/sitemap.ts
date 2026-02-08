import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.icoffio.com';
  const locales = ['en', 'pl'];
  const categories = ['ai', 'apple', 'digital', 'tech', 'games', 'news-2'];

  const routes: MetadataRoute.Sitemap = [];

  // ── Homepage ──
  routes.push({ url: base, priority: 1, changeFrequency: 'daily' });

  locales.forEach(locale => {
    routes.push({
      url: `${base}/${locale}`,
      priority: 0.9,
      changeFrequency: 'daily',
      alternates: {
        languages: Object.fromEntries(locales.map(l => [l, `${base}/${l}`])),
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
      });
    });
  });

  // ── Article pages — fetch per locale to get correct slugs ──
  for (const locale of locales) {
    try {
      const posts = await getAllPosts(200, locale);
      for (const post of posts) {
        // Determine the alternate slug for the other locale
        const baseSlug = post.slug.replace(/-en$/, '').replace(/-pl$/, '');
        const altLocale = locale === 'en' ? 'pl' : 'en';
        const altSlug = `${baseSlug}-${altLocale}`;

        routes.push({
          url: `${base}/${locale}/article/${post.slug}`,
          priority: 0.7,
          changeFrequency: 'monthly',
          lastModified: new Date(post.publishedAt || post.date || new Date()),
          alternates: {
            languages: {
              [locale]: `${base}/${locale}/article/${post.slug}`,
              [altLocale]: `${base}/${altLocale}/article/${altSlug}`,
            },
          },
        });
      }
    } catch (error) {
      console.warn(`Sitemap: could not fetch posts for ${locale}:`, error);
    }
  }

  return routes;
}
