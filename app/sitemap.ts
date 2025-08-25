// ВРЕМЕННО УПРОЩЕН пока GraphQL нестабилен
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://icoffio.com";
  
  // Статичный sitemap пока DNS стабилизируется
  return [
    { url: base, priority: 1 },
    { url: `${base}/en`, priority: 0.9 },
    { url: `${base}/pl`, priority: 0.9 },
    { url: `${base}/de`, priority: 0.9 },
    { url: `${base}/ro`, priority: 0.9 },
    { url: `${base}/cs`, priority: 0.9 },
  ];
}
