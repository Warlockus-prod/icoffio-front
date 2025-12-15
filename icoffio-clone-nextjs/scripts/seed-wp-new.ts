// scripts/seed-wp-new.ts
// Новый сидер с категорией Digital и английским контентом

const WP_BASE = process.env.WP_BASE || "https://icoffio.com";
const WP_USER = process.env.WP_USER!;
const WP_APP_PASS = process.env.WP_APP_PASS!;

if (!WP_USER || !WP_APP_PASS) {
  console.error("Set WP_USER and WP_APP_PASS env vars");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");

// Сначала нужно создать категорию Digital в WordPress
async function createDigitalCategory() {
  try {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/categories`, {
      method: "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Digital",
        slug: "digital",
        description: "Digital transformation, privacy, and modern technology trends"
      })
    });

    const json: any = await res.json();
    if (res.status === 201) {
      console.log(`✅ Created Digital category with ID: ${json.id}`);
      return json.id;
    } else if (json.code === 'term_exists') {
      console.log(`✅ Digital category already exists with ID: ${json.data.term_id}`);
      return json.data.term_id;
    } else {
      console.error("Category creation error:", json);
      return 8; // fallback ID
    }
  } catch (e) {
    console.warn("Category creation failed, using fallback ID:", e);
    return 8; // fallback ID
  }
}

// Обновленная карта категорий
const CATEGORY_MAP: Record<string, number> = {
  ai: 5,
  apple: 4, 
  games: 7,
  "news-2": 1,
  tech: 3,
  digital: 8, // Будет обновлено после создания
};

type PostSeed = {
  cat: keyof typeof CATEGORY_MAP;
  title: string;
  image: string;
  content: string;
};

const NEW_POSTS: PostSeed[] = [
  { 
    cat: "digital", 
    title: "Digital Transformation in 2025: What Businesses Need to Know", 
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop", 
    content: "The digital landscape continues to evolve rapidly. Companies that adapt to new technologies like cloud computing, automation, and digital-first customer experiences will thrive in the coming years. This comprehensive guide covers essential strategies for successful digital transformation."
  },
  { 
    cat: "digital", 
    title: "Privacy in the Digital Age: Essential Tools to Protect Your Data", 
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop", 
    content: "Online privacy has never been more important. Learn about essential tools and practices to keep your personal information secure while navigating our increasingly connected world. From VPNs to encrypted messaging, discover the technologies that protect your digital life."
  },
  { 
    cat: "digital", 
    title: "The Future of Remote Work: Digital Tools Reshaping Collaboration", 
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop", 
    content: "Remote work is here to stay, and new digital collaboration tools are making distributed teams more productive than ever. Explore the latest platforms and technologies that are redefining how we work together across distances."
  }
];

function slugify(s: string) {
  return s.toLowerCase().replace(/—|–/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image download failed");
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}

async function uploadMedia(imageUrl: string): Promise<number> {
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

    const json: any = await res.json();
    if (!res.ok) {
      console.error("Media upload error:", json);
      return 0;
    }
    return json.id || 0;
  } catch (e) {
    console.warn("Media not uploaded:", e);
    return 0;
  }
}

async function createPost(p: PostSeed, digitalCategoryId: number) {
  const featured_media = await uploadMedia(p.image);
  const slug = slugify(p.title);
  const categoryId = p.cat === 'digital' ? digitalCategoryId : CATEGORY_MAP[p.cat] || 0;

  const body = {
    title: p.title,
    slug,
    status: "publish",
    content: `<div style="margin-bottom: 20px;"><img src="${p.image}" alt="${p.title}" style="width: 100%; height: auto; border-radius: 8px;" /></div><h2>${p.title}</h2><p>${p.content}</p>`,
    excerpt: `${p.content.substring(0, 150)}...`,
    categories: categoryId ? [categoryId] : [],
    featured_media,
    meta: {
      _seo_title: p.title,
      _seo_description: p.content.substring(0, 160)
    }
  };

  try {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });

    const json: any = await res.json();
    if (!res.ok) {
      console.error("Create post error:", json);
      throw new Error("create failed");
    }
    console.log(`✅ Created: ${json.slug} (Category: ${p.cat})`);
    return json;
  } catch (e) {
    console.error(`❌ Failed to create post "${p.title}":`, e);
    throw e;
  }
}

(async () => {
  console.log("🚀 Starting WordPress content seeding with Digital category...");
  
  try {
    // Создаем категорию Digital
    const digitalCategoryId = await createDigitalCategory();
    CATEGORY_MAP.digital = digitalCategoryId;
    
    console.log("📝 Creating new posts...");
    for (const p of NEW_POSTS) {
      try {
        await createPost(p, digitalCategoryId);
        // Небольшая задержка между постами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(`Failed to create post: ${p.title}`, e);
      }
    }
    
    console.log("🎉 Seeding completed successfully!");
    console.log("📋 Summary:");
    console.log(`- Digital category ID: ${digitalCategoryId}`);
    console.log(`- Created ${NEW_POSTS.length} new posts`);
    
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  }
})();

