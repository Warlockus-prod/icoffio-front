import { getCategoryBySlug, getPostsByCategory, getCategorySlugs } from "@/lib/data";
import { Container } from "@/components/Container";
import { ArticleCard } from "@/components/ArticleCard";
import { UniversalAd } from "@/components/UniversalAd";
import { getAdPlacementsByLocation } from "@/lib/config/adPlacements";
import { notFound } from "next/navigation";

export const revalidate = 3600; // 1 hour

// TEMPORARILY DISABLED until DNS stabilizes
// export async function generateStaticParams() {
//   const slugs = await getCategorySlugs();
//   const locales = ['en', 'pl', 'de', 'ro', 'cs'];
//   
//   return locales.flatMap(locale => 
//     slugs.map(slug => ({ locale, slug }))
//   );
// }

// Categories (fallback system)
const mockCategories = [
  { name: "AI", slug: "ai" },
  { name: "Apple", slug: "apple" },
  { name: "Digital", slug: "digital" },
  { name: "Tech", slug: "tech" },
  { name: "News", slug: "news" }
];

const mockPosts = [
  {
    id: "1",
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-13T10:00:00Z",
    content: ""
  },
  {
    id: "2",
    slug: "ai-breakthrough-gpt5-multimodal-intelligence",
    title: "AI Breakthrough: GPT-5 and Multimodal Intelligence",
    excerpt: "Next generation AI models promise unprecedented understanding across text, images, audio, and video.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-13T10:00:00Z",
    content: ""
  },
  {
    id: "3",
    slug: "quantum-computing-ibm-1000-qubit",
    title: "Quantum Computing: IBM's 1000+ Qubit Processor",
    excerpt: "IBM achieves major milestone with their latest quantum processor bringing us closer to practical applications.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-12T14:30:00Z",
    content: ""
  },
  {
    id: "4",
    slug: "gaming-trends-2024-next-gen",
    title: "Gaming Trends 2024: Next Generation Gaming",
    excerpt: "Discover the latest trends shaping the future of gaming including cloud gaming and AI-powered NPCs.",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-12T14:30:00Z",
    content: ""
  },
  {
    id: "5",
    slug: "cybersecurity-ai-defense-2024",
    title: "Cybersecurity 2024: AI-Powered Defense",
    excerpt: "Advanced AI systems protecting against sophisticated cyber threats with real-time detection.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-11T16:20:00Z",
    content: ""
  },
  {
    id: "6",
    slug: "tech-news-weekly-innovations",
    title: "Tech News Weekly: Latest Innovations",
    excerpt: "Your weekly roundup of the most important technology news and breakthroughs.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200",
    category: { name: "News", slug: "news" },
    publishedAt: "2025-01-11T16:20:00Z",
    content: ""
  },
  {
    id: "7",
    slug: "apple-iphone-16-innovation",
    title: "Apple iPhone 16: Innovation Continues",
    excerpt: "The latest iPhone brings breakthrough features and performance improvements.",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=1200",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-10T12:45:00Z",
    content: ""
  },
  {
    id: "8",
    slug: "neural-networks-future-ai",
    title: "Neural Networks: The Future of AI",
    excerpt: "Revolutionary brain-computer interfaces enabling direct neural control of devices.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-10T12:45:00Z",
    content: ""
  },
  {
    id: "9",
    slug: "gaming-vr-metaverse-2024",
    title: "Gaming VR & Metaverse 2024",
    excerpt: "Virtual reality gaming reaches new heights with immersive metaverse experiences.",
    image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?q=80&w=1200",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-09T09:15:00Z",
    content: ""
  },
  // Additional AI articles for better diversity
  {
    id: "10",
    slug: "machine-learning-healthcare-2024",
    title: "Machine Learning Revolutionizes Healthcare Diagnostics",
    excerpt: "AI-powered diagnostic tools achieve 95% accuracy in early disease detection.",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-09T09:15:00Z",
    content: ""
  },
  {
    id: "11",
    slug: "autonomous-vehicles-ai-2024",
    title: "Autonomous Vehicles: AI Reaches Level 4 Automation",
    excerpt: "Self-driving cars achieve remarkable safety milestones with advanced AI systems.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-08T15:30:00Z",
    content: ""
  },
  {
    id: "12",
    slug: "natural-language-processing-breakthroughs",
    title: "Natural Language Processing: Understanding Context Like Never Before",
    excerpt: "Latest NLP models demonstrate human-level language comprehension across 100+ languages.",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-08T11:20:00Z",
    content: ""
  },
  {
    id: "13",
    slug: "ai-creative-industries-2024",
    title: "AI in Creative Industries: Augmenting Human Creativity",
    excerpt: "Artists and designers leverage AI tools to push creative boundaries in unprecedented ways.",
    image: "https://images.unsplash.com/photo-1547954575-855750c57bd3?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-07T14:45:00Z",
    content: ""
  },
  {
    id: "14",
    slug: "computer-vision-object-recognition",
    title: "Computer Vision: Real-Time Object Recognition Perfected",
    excerpt: "Advanced computer vision systems identify and track objects with near-perfect accuracy.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-07T10:15:00Z",
    content: ""
  },
  {
    id: "15",
    slug: "ai-climate-change-solutions",
    title: "AI Tackles Climate Change: Predictive Models Save Resources",
    excerpt: "Machine learning algorithms optimize energy consumption and predict environmental patterns.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-06T16:30:00Z",
    content: ""
  },
  {
    id: "16",
    slug: "robotics-ai-integration-2024",
    title: "Robotics and AI: The Perfect Partnership",
    excerpt: "Intelligent robots perform complex tasks with human-like dexterity and decision-making.",
    image: "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-06T13:00:00Z",
    content: ""
  },
  {
    id: "17",
    slug: "ai-education-personalized-learning",
    title: "AI in Education: Personalized Learning Paths for Every Student",
    excerpt: "Adaptive learning systems tailor educational content to individual student needs and pace.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-05T09:45:00Z",
    content: ""
  },
  // Additional articles for other categories
  {
    id: "18",
    slug: "apple-silicon-m4-performance",
    title: "Apple Silicon M4: Redefining Performance Standards",
    excerpt: "Next-generation Apple chips deliver unprecedented performance per watt efficiency.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-05T08:30:00Z",
    content: ""
  },
  {
    id: "19",
    slug: "cloud-gaming-revolution-2024",
    title: "Cloud Gaming Revolution: Play AAA Titles Anywhere",
    excerpt: "5G networks enable lag-free cloud gaming on mobile devices with console-quality graphics.",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-04T15:20:00Z",
    content: ""
  },
  {
    id: "20",
    slug: "5g-networks-global-rollout",
    title: "5G Networks: Global Rollout Accelerates",
    excerpt: "Ultra-fast 5G connectivity transforms how we work, play, and communicate worldwide.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-04T11:10:00Z",
    content: ""
  }
];

export default async function CategoryPage({ params }: { params: { locale: string; slug: string } }) {
  // Get category page ads
  const categoryAds = getAdPlacementsByLocation('category');
  const adsDesktop = categoryAds.filter(ad => ad.device === 'desktop');
  const adsMobile = categoryAds.filter(ad => ad.device === 'mobile');
  
  // Fallback system: Start with mock data
  let category: any = mockCategories.find(c => c.slug === params.slug);
  let posts: any[] = mockPosts.filter(p => p.category.slug === params.slug);

  // ✅ TRY TO GET REAL DATA from WordPress GraphQL
  try {
    const graphqlCategory = await getCategoryBySlug(params.slug, params.locale);
    const graphqlPosts = await getPostsByCategory(params.slug, 24, params.locale);
    
    // Use real data if successfully retrieved
    if (graphqlCategory) {
      category = graphqlCategory;
    }
    if (graphqlPosts && graphqlPosts.length > 0) {
      posts = graphqlPosts;
    }
  } catch (error) {
    // ✅ GRACEFUL DEGRADATION: If GraphQL doesn't work, use fallback
    console.error(`GraphQL Error for category ${params.slug} (using fallback content):`, error);
    // Continue with mock data - site works!
  }

  // If category not found even in mock data - 404
  if (!category) {
    return notFound();
  }

  return (
    <Container>
      <h1 className="text-2xl font-extrabold mb-6">{category.name}</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.length > 0 ? (
          posts.map((p) => (
            <ArticleCard key={p.slug} post={p} locale={params.locale} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              No articles found in this category yet.
            </p>
          </div>
        )}
      </div>
      
      {/* Category Ads - Desktop */}
      {adsDesktop.map((ad) => (
        <div key={ad.id} className="mt-8 hidden lg:block">
          <UniversalAd 
            placeId={ad.placeId} 
            format={ad.format}
            placement={ad.placement}
            enabled={ad.enabled}
          />
        </div>
      ))}
      
      {/* Category Ads - Mobile */}
      {adsMobile.map((ad) => (
        <div key={ad.id} className="mt-8 lg:hidden">
          <UniversalAd 
            placeId={ad.placeId} 
            format={ad.format}
            placement={ad.placement}
            enabled={ad.enabled}
          />
        </div>
      ))}
    </Container>
  );
}
