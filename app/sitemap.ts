import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://icoffio.com";
  const locales = ['ru', 'en', 'pl', 'de', 'ro', 'cs'];
  const categories = ['ai', 'apple', 'digital', 'tech', 'news-2'];
  
  const routes: MetadataRoute.Sitemap = [];
  
  // Homepage and language versions
  routes.push({ url: base, priority: 1, changeFrequency: 'daily' });
  locales.forEach(locale => {
    routes.push({
      url: `${base}/${locale}`,
      priority: 0.9,
      changeFrequency: 'daily',
      alternates: {
        languages: Object.fromEntries(
          locales.map(l => [l, `${base}/${l}`])
        )
      }
    });
  });
  
  // Category pages
  locales.forEach(locale => {
    categories.forEach(category => {
      routes.push({
        url: `${base}/${locale}/category/${category}`,
        priority: 0.8,
        changeFrequency: 'weekly'
      });
    });
  });
  
  // Article pages
  try {
    const posts = await getAllPosts(100);
    locales.forEach(locale => {
      posts.forEach(post => {
        routes.push({
          url: `${base}/${locale}/article/${post.slug}`,
          priority: 0.7,
          changeFrequency: 'monthly',
          lastModified: new Date(post.publishedAt || post.date || new Date()),
          alternates: {
            languages: Object.fromEntries(
              locales.map(l => [l, `${base}/${l}/article/${post.slug}`])
            )
          }
        });
      });
    });
  } catch (error) {
    console.warn('Could not fetch posts for sitemap:', error);
  }
  
  return routes;
}
