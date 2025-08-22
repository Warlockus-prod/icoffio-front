import { getAllSlugs, getCategorySlugs } from "@/lib/data";

export default async function sitemap() {
  const posts = await getAllSlugs();
  const cats = await getCategorySlugs();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: base, priority: 1 },
    ...posts.map((slug) => ({ url: `${base}/article/${slug}`, priority: 0.8 })),
    ...cats.map((slug) => ({ url: `${base}/category/${slug}`, priority: 0.6 })),
  ];
}
