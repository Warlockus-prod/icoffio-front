// scripts/seed-wp.js
// Запуск:
// WP_BASE=https://icoffio.com WP_USER=admin WP_APP_PASS="V3Be tZgA 5Gxa Ph8N 13iO 4mju" npm run seed

const WP_BASE = process.env.WP_BASE || "https://icoffio.com";
const WP_USER = process.env.WP_USER;
const WP_APP_PASS = process.env.WP_APP_PASS;
if (!WP_USER || !WP_APP_PASS) {
  console.error("Set WP_USER and WP_APP_PASS env vars"); process.exit(1);
}
const AUTH = "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");

// slug -> numeric ID (из твоих данных)
const CATEGORY_MAP = {
  ai: 5, apple: 4, games: 7, "news-2": 1, tech: 3,
};

const POSTS = [
  { cat:"ai",    title:"Нейросети в кармане: как смартфоны понимают речь",
    image:"https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    content:"Демо‑контент для настройки фронта. Что произошло, почему важно, что делать читателю."},
  { cat:"tech",  title:"Тонкие ноутбуки 2025: что важно при выборе",
    image:"https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    content:"Короткий обзор трендов и на что смотреть при покупке."},
  { cat:"apple", title:"iOS 19: пять функций, которые экономят время",
    image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    content:"Полезные мелочи, которые ощущаются каждый день."},
  { cat:"games", title:"Инди‑хиты месяца: что поиграть на выходных",
    image:"https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1200&auto=format&fit=crop",
    content:"Небольшая подборка проектов с хорошим геймплеем."},
  { cat:"news-2",title:"Мини‑обзор: наушники с кейсом‑мышкой — удобно ли это?",
    image:"https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=1200&auto=format&fit=crop",
    content:"Необычный форм‑фактор и реальный опыт использования."},
];

function slugify(s) {
  return s.toLowerCase().replace(/—|–/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image download failed");
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}

async function uploadMedia(imageUrl) {
  try {
    const buf = await fetchBuffer(imageUrl);
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="cover.jpg"',
      },
      body: buf,
    });
    const json = await res.json();
    if (!res.ok) { console.error("Media upload error:", json); return 0; }
    return json.id || 0;
  } catch (e) {
    console.warn("Media not uploaded:", e); return 0;
  }
}

async function createPost(p) {
  const featured_media = await uploadMedia(p.image);
  const slug = slugify(p.title);
  const categoryId = CATEGORY_MAP[p.cat] || 0;

  const body = {
    title: p.title,
    slug,
    status: "publish",
    content: `<p><img src="${p.image}" alt=""/></p><p><strong>${p.title}</strong></p><p>${p.content}</p>`,
    excerpt: `Короткий анонс: ${p.title}`,
    categories: categoryId ? [categoryId] : [],
    featured_media,
  };

  const res = await fetch(`${WP_BASE}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error("Create post error:", json); throw new Error("create failed"); }
  console.log("✅ Created:", json.slug);
}

(async () => {
  console.log("🚀 Starting WordPress seeding...");
  for (const p of POSTS) {
    try { 
      console.log(`📝 Creating: ${p.title}`);
      await createPost(p); 
    } catch (e) { 
      console.error(`❌ Failed to create: ${p.title}`, e); 
    }
  }
  console.log("🎉 Seeding completed!");
})();
