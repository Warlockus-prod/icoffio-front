// scripts/seed-all-categories.ts
// Массовое добавление актуальных статей по всем категориям

const WP_BASE = process.env.WP_BASE || "https://icoffio.com";
const WP_USER = process.env.WP_USER!;
const WP_APP_PASS = process.env.WP_APP_PASS!;

if (!WP_USER || !WP_APP_PASS) {
  console.error("Set WP_USER and WP_APP_PASS env vars");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");

// Актуальная карта категорий
const CATEGORY_MAP: Record<string, number> = {
  ai: 5,
  apple: 4,
  games: 7,
  "news-2": 1,
  tech: 3,
  digital: 8,
};

type PostSeed = {
  cat: keyof typeof CATEGORY_MAP;
  title: string;
  image: string;
  content: string;
};

// 🤖 AI категория - 5 актуальных статей
const AI_POSTS: PostSeed[] = [
  {
    cat: "ai",
    title: "ChatGPT-5 vs Claude 3.5: The Ultimate AI Comparison 2025",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop",
    content: "The AI landscape is evolving rapidly with the latest updates to ChatGPT-5 and Claude 3.5 Sonnet. We compare their capabilities in coding, reasoning, and creative tasks. Which AI assistant provides the best value for professionals and developers in 2025?"
  },
  {
    cat: "ai",
    title: "AI-Powered Smartphones: How On-Device Intelligence Changes Everything",
    image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?q=80&w=1200&auto=format&fit=crop",
    content: "Modern smartphones now feature dedicated AI chips that process everything locally - from photo enhancement to voice recognition. Explore how on-device AI improves battery life, privacy, and performance while reducing dependence on cloud services."
  },
  {
    cat: "ai",
    title: "GitHub Copilot vs Cursor AI: Best Coding Assistant for Developers",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=1200&auto=format&fit=crop",
    content: "AI-powered coding assistants are revolutionizing software development. We test GitHub Copilot, Cursor AI, and other tools to find which one offers the best code completion, debugging assistance, and productivity improvements for different programming languages."
  },
  {
    cat: "ai",
    title: "AI Art Generation: Midjourney vs DALL-E 3 vs Stable Diffusion",
    image: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?q=80&w=1200&auto=format&fit=crop",
    content: "Creative AI tools are becoming more sophisticated and accessible. Compare the latest versions of popular AI art generators, their unique strengths, pricing models, and which tool works best for different creative projects and professional use cases."
  },
  {
    cat: "ai",
    title: "Voice AI Breakthrough: Real-Time Translation That Actually Works",
    image: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=1200&auto=format&fit=crop",
    content: "Real-time voice translation technology has reached a new milestone. Modern AI can now translate conversations with near-perfect accuracy while preserving tone and context. Discover how this technology is breaking down language barriers in business and travel."
  }
];

// 🍎 Apple категория - 5 актуальных статей
const APPLE_POSTS: PostSeed[] = [
  {
    cat: "apple",
    title: "iPhone 16 Pro Max Review: Is the Camera Upgrade Worth It?",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=1200&auto=format&fit=crop",
    content: "Apple's iPhone 16 Pro Max brings significant camera improvements with the new 48MP ultra-wide sensor and enhanced computational photography. After two weeks of testing, we evaluate whether the upgrade justifies the premium price for photography enthusiasts."
  },
  {
    cat: "apple",
    title: "Apple Intelligence Finally Available: What It Can and Can't Do",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=1200&auto=format&fit=crop",
    content: "Apple Intelligence has rolled out to iPhone 15 Pro and newer models. We test the new writing tools, improved Siri, and Smart Reply features to see how Apple's AI approach differs from competitors and whether it lives up to the hype."
  },
  {
    cat: "apple",
    title: "Vision Pro One Year Later: Hits, Misses, and the Future",
    image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?q=80&w=1200&auto=format&fit=crop",
    content: "Apple Vision Pro has been available for a year. We analyze its impact on the VR/AR industry, the most successful apps, remaining challenges, and what to expect from the rumored Vision Pro 2 with improved comfort and lower price point."
  },
  {
    cat: "apple",
    title: "macOS Sequoia Hidden Features Every Mac User Should Know",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
    content: "macOS Sequoia brings subtle but powerful improvements to productivity and workflow. Discover hidden features like enhanced window management, improved Safari profiles, and new keyboard shortcuts that can significantly boost your Mac productivity."
  },
  {
    cat: "apple",
    title: "AirPods Pro 3 Rumors: Health Monitoring and Hearing Aid Features",
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?q=80&w=1200&auto=format&fit=crop",
    content: "Leaked reports suggest AirPods Pro 3 will include advanced health monitoring capabilities, including heart rate tracking and FDA-approved hearing aid functionality. We analyze the technical challenges and potential impact on the wearables market."
  }
];

// 🎮 Games категория - 5 актуальных статей  
const GAMES_POSTS: PostSeed[] = [
  {
    cat: "games",
    title: "Best VR Games of 2025: Immersive Experiences Worth Playing",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
    content: "Virtual reality gaming has matured significantly with titles that offer truly compelling experiences. From action adventures to puzzle games, we review the most impressive VR games that showcase the potential of immersive gaming technology."
  },
  {
    cat: "games",
    title: "Steam Deck vs Nintendo Switch OLED: Portable Gaming Showdown",
    image: "https://images.unsplash.com/photo-1606503153255-59d8b8b13176?q=80&w=1200&auto=format&fit=crop",
    content: "Portable gaming devices offer different strengths for on-the-go entertainment. We compare performance, battery life, game libraries, and overall value to help you choose between Valve's Steam Deck and Nintendo's Switch OLED for your portable gaming needs."
  },
  {
    cat: "games",
    title: "Mobile Gaming Revolution: AAA Titles Coming to Smartphones",
    image: "https://images.unsplash.com/photo-1556438064-2d7646166914?q=80&w=1200&auto=format&fit=crop",
    content: "High-end mobile processors now enable console-quality gaming on smartphones. Explore how games like Resident Evil and Assassin's Creed are being adapted for mobile platforms and what this means for the future of portable gaming."
  },
  {
    cat: "games",
    title: "Indie Game Gems: Hidden Masterpieces You Probably Missed",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    content: "Independent developers continue to create innovative gaming experiences that often surpass big-budget titles in creativity and storytelling. Discover remarkable indie games that deserve attention from every gaming enthusiast."
  },
  {
    cat: "games",
    title: "Gaming Laptops 2025: Best Value for Money Under $1500",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    content: "Modern gaming laptops offer impressive performance at reasonable prices. We test the latest models under $1500 to find the best balance of gaming power, display quality, and portability for budget-conscious gamers."
  }
];

// 💻 Tech категория - 5 актуальных статей
const TECH_POSTS: PostSeed[] = [
  {
    cat: "tech",
    title: "Foldable Phones 2025: Samsung Galaxy Z Fold 6 vs Google Pixel Fold 2",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200&auto=format&fit=crop",
    content: "Foldable smartphones are becoming mainstream with improved durability and software optimization. Compare the latest flagship foldables from Samsung and Google to see which offers better productivity, camera performance, and overall value."
  },
  {
    cat: "tech",
    title: "6G Network Technology: What to Expect from Next-Generation Connectivity",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop",
    content: "While 5G networks are still expanding globally, research into 6G technology is already underway. Explore the potential capabilities of 6G networks, including holographic communications, ultra-low latency, and integration with AI systems."
  },
  {
    cat: "tech",
    title: "Quantum Computing Breakthrough: Google's New Chip Changes Everything",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
    content: "Google's latest quantum computing chip represents a significant leap in processing power and error correction. Understand how quantum computers work, their practical applications, and when this technology might impact everyday computing."
  },
  {
    cat: "tech",
    title: "Solid State Batteries: The Future of Electric Vehicle Technology",
    image: "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?q=80&w=1200&auto=format&fit=crop",
    content: "Solid-state battery technology promises to solve major electric vehicle challenges including charging time, range, and safety. Examine the latest developments from Toyota, Samsung, and other companies racing to commercialize this breakthrough technology."
  },
  {
    cat: "tech",
    title: "Smart Home 2025: Best Devices That Actually Improve Daily Life",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop",
    content: "Smart home technology has evolved beyond novelty gadgets to genuinely useful devices. Review the most practical smart home products that offer real convenience, energy savings, and security improvements for modern households."
  }
];

// 📰 News категория - 5 актуальных статей
const NEWS_POSTS: PostSeed[] = [
  {
    cat: "news-2",
    title: "Tech Industry Layoffs 2025: What's Really Happening Behind the Headlines",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
    content: "Major tech companies continue restructuring their workforce amid changing market conditions. Analyze the real reasons behind recent layoffs, which roles are most affected, and what this means for the tech industry's future direction."
  },
  {
    cat: "news-2",
    title: "EU Digital Markets Act Impact: How New Regulations Change Tech Giants",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    content: "European Union's Digital Markets Act is forcing significant changes in how tech giants operate. Explore how Apple, Google, and Meta are adapting their business models to comply with new regulations and what this means for consumers globally."
  },
  {
    cat: "news-2",
    title: "Cryptocurrency Market 2025: Bitcoin ETFs and Institutional Adoption",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop",
    content: "Bitcoin ETF approvals have opened cryptocurrency markets to traditional investors. Examine how institutional adoption is changing the crypto landscape, regulatory developments, and what this means for the future of digital currencies."
  },
  {
    cat: "news-2",
    title: "China's AI Chip Ban: Global Semiconductor Supply Chain Impact",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    content: "Geopolitical tensions continue to reshape the global semiconductor industry. Analyze how trade restrictions on AI chips are affecting tech companies, forcing supply chain diversification, and influencing global technology development."
  },
  {
    cat: "news-2",
    title: "Social Media Platform Exodus: Users Migrate to Alternative Networks",
    image: "https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop",
    content: "Growing concerns about privacy and content moderation are driving users to alternative social media platforms. Explore the rise of decentralized networks, new competitors to traditional platforms, and changing user behavior in social media."
  }
];

// 🌐 Digital категория - 2 дополнительные статьи (уже есть 3)
const DIGITAL_ADDITIONAL: PostSeed[] = [
  {
    cat: "digital",
    title: "Cybersecurity Threats 2025: Protecting Against AI-Powered Attacks",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
    content: "Cybercriminals are leveraging AI to create more sophisticated attacks including deepfake phishing and automated vulnerability exploitation. Learn about emerging threats and the defensive technologies organizations are implementing to stay secure."
  },
  {
    cat: "digital",
    title: "Web3 and Decentralized Internet: Beyond the Cryptocurrency Hype",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1200&auto=format&fit=crop",
    content: "Web3 technology promises a more decentralized internet where users control their data and digital identity. Examine practical applications beyond cryptocurrency, including decentralized storage, identity verification, and content distribution."
  }
];

// Объединяем все статьи
const ALL_POSTS: PostSeed[] = [
  ...AI_POSTS,
  ...APPLE_POSTS, 
  ...GAMES_POSTS,
  ...TECH_POSTS,
  ...NEWS_POSTS,
  ...DIGITAL_ADDITIONAL
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

async function createPost(p: PostSeed, index: number, total: number) {
  console.log(`📝 Creating (${index + 1}/${total}): ${p.title}`);
  
  const featured_media = await uploadMedia(p.image);
  const slug = slugify(p.title);
  const categoryId = CATEGORY_MAP[p.cat] || 0;

  const body = {
    title: p.title,
    slug,
    status: "publish",
    content: `<div style="margin-bottom: 20px;"><img src="${p.image}" alt="${p.title}" style="width: 100%; height: auto; border-radius: 8px;" /></div><h2>${p.title}</h2><p style="font-size: 18px; line-height: 1.6;">${p.content}</p><p><em>Stay tuned for more updates on this developing story.</em></p>`,
    excerpt: `${p.content.substring(0, 160)}...`,
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
    console.log(`✅ Created: ${json.slug} (${p.cat.toUpperCase()})`);
    return json;
  } catch (e) {
    console.error(`❌ Failed to create post "${p.title}":`, e);
    throw e;
  }
}

(async () => {
  console.log("🚀 Starting mass content creation for all categories...");
  console.log(`📊 Total articles to create: ${ALL_POSTS.length}`);
  console.log("📋 Breakdown by category:");
  console.log(`   🤖 AI: ${AI_POSTS.length} articles`);
  console.log(`   🍎 Apple: ${APPLE_POSTS.length} articles`);
  console.log(`   🎮 Games: ${GAMES_POSTS.length} articles`);
  console.log(`   💻 Tech: ${TECH_POSTS.length} articles`);
  console.log(`   📰 News: ${NEWS_POSTS.length} articles`);
  console.log(`   🌐 Digital: ${DIGITAL_ADDITIONAL.length} additional articles`);
  console.log("");
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (let i = 0; i < ALL_POSTS.length; i++) {
      const post = ALL_POSTS[i];
      try {
        await createPost(post, i, ALL_POSTS.length);
        successCount++;
        
        // Задержка между постами чтобы не перегружать WordPress
        if (i < ALL_POSTS.length - 1) {
          console.log("⏳ Waiting 2 seconds before next post...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        console.error(`Failed to create post: ${post.title}`, e);
        failCount++;
      }
    }
    
    console.log("");
    console.log("🎉 Mass content creation completed!");
    console.log("📊 Final statistics:");
    console.log(`   ✅ Successfully created: ${successCount} articles`);
    console.log(`   ❌ Failed: ${failCount} articles`);
    console.log(`   📈 Success rate: ${Math.round((successCount / ALL_POSTS.length) * 100)}%`);
    console.log("");
    console.log("🔗 Your WordPress now has comprehensive content across all categories!");
    console.log("🚀 Ready to deploy your fully-featured news platform!");
    
  } catch (e) {
    console.error("❌ Mass content creation failed:", e);
    process.exit(1);
  }
})();
