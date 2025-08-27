import { getAllPosts, getTopPosts, getCategories } from "@/lib/data";
import { ArticleCard } from "@/components/ArticleCard";
import { Hero } from "@/components/Hero";
import { CategoryNav } from "@/components/CategoryNav";
import { Container } from "@/components/Container";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: t.siteTitle,
    description: t.siteDescription,
    keywords: "technology, gadgets, Apple, iPhone, AI, games, news, reviews",
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      url: process.env.NEXT_PUBLIC_SITE_URL,
      siteName: "icoffio",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "icoffio - technology and gadgets",
        },
      ],
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t.siteTitle,
      description: t.siteDescription,
      images: ["/og.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: process.env.NEXT_PUBLIC_SITE_URL,
      languages: {
        'en': '/en',
        'pl': '/pl', 
        'de': '/de',
        'ro': '/ro',
        'cs': '/cs',
      },
    },
  };
}

export const revalidate = 120;

// КАЧЕСТВЕННЫЙ КОНТЕНТ - ТЕХНОЛОГИЧЕСКИЕ СТАТЬИ
const mockCategories = [
  { name: "AI", slug: "ai" },
  { name: "Apple", slug: "apple" },
  { name: "Digital", slug: "digital" },
  { name: "Tech", slug: "tech" },
  { name: "News", slug: "news-2" }
];

const mockPosts = [
  {
    id: "1",
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content, offering unprecedented spatial computing capabilities.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-13",
    content: ""
  },
  {
    id: "2", 
    slug: "ai-breakthrough-gpt5-understanding-multimodal-intelligence",
    title: "AI Breakthrough: GPT-5 and the Future of Multimodal Intelligence",
    excerpt: "The next generation of AI models promises unprecedented understanding across text, images, audio, and video, marking a new era in artificial intelligence.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-13",
    content: ""
  },
  {
    id: "3",
    slug: "quantum-computing-breakthrough-ibm-1000-qubit-processor",
    title: "Quantum Computing Breakthrough: IBM's 1000+ Qubit Processor",
    excerpt: "IBM achieves a major milestone in quantum computing with their latest 1000+ qubit processor, bringing us closer to practical quantum applications.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-12",
    content: ""
  },
  {
    id: "4",
    slug: "metaverse-evolution-beyond-virtual-reality",
    title: "The Metaverse Evolution: Beyond Virtual Reality",
    excerpt: "From gaming worlds to digital workspaces, the metaverse is reshaping human interaction and creating new economic opportunities in virtual environments.",
    image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-12",
    content: ""
  },
  {
    id: "5",
    slug: "cybersecurity-2024-ai-powered-defense-systems",
    title: "Cybersecurity 2024: AI-Powered Defense Systems",
    excerpt: "Advanced AI systems are now protecting against sophisticated cyber threats, offering real-time threat detection and automated response capabilities.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-11",
    content: ""
  },
  {
    id: "6",
    slug: "sustainable-tech-green-computing-revolution",
    title: "Sustainable Tech: The Green Computing Revolution",
    excerpt: "Technology companies are pioneering eco-friendly solutions, from renewable energy data centers to biodegradable electronics.",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "News", slug: "news-2" },
    publishedAt: "2025-01-11",
    content: ""
  },
  {
    id: "7",
    slug: "neural-interfaces-brain-computer-connections",
    title: "Neural Interfaces: The Future of Brain-Computer Connections",
    excerpt: "Revolutionary brain-computer interfaces are enabling direct neural control of digital devices, opening new possibilities for human enhancement.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-10",
    content: ""
  },
  {
    id: "8",
    slug: "web3-decentralized-internet-revolution",
    title: "Web3: The Decentralized Internet Revolution",
    excerpt: "Web3 technologies are creating a more open, user-controlled internet where privacy and data ownership take center stage.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-10",
    content: ""
  },
  {
    id: "9",
    slug: "robotics-automation-manufacturing-transformation",
    title: "Robotics & Automation: Manufacturing Transformation",
    excerpt: "Advanced robotics and AI automation are revolutionizing manufacturing, creating smarter, more efficient production systems.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-09",
    content: ""
  }
];

export default async function Page({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  
  // Используем качественный контент вместо GraphQL
  let heroPosts: any[] = mockPosts.slice(0, 3);
  let posts: any[] = mockPosts.slice(0, 9);
  let cats: any[] = mockCategories;
  
  // Попытка получить данные из GraphQL (если работает)
  try {
    const graphqlHeroPosts = await getTopPosts(3);
    const graphqlPosts = await getAllPosts(12);
    const graphqlCats = await getCategories();
    
    // Используем GraphQL данные если они есть
    if (graphqlHeroPosts && graphqlHeroPosts.length > 0) heroPosts = graphqlHeroPosts;
    if (graphqlPosts && graphqlPosts.length > 0) posts = graphqlPosts;
    if (graphqlCats && graphqlCats.length > 0) cats = graphqlCats;
  } catch (error) {
    console.error('GraphQL Error (using fallback content):', error);
    // Используем качественные моки
  }

  return (
    <>
      <Container>
        <CategoryNav categories={cats} locale={params.locale} />
      </Container>

      {heroPosts && heroPosts.length > 0 && <Hero posts={heroPosts} locale={params.locale} />}

      <div className="mx-auto max-w-6xl px-4">
        <section className="py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t.latestNews}</h2>
            <p className="text-neutral-600 dark:text-neutral-300">{t.mostActualEvents}</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <ArticleCard key={p.slug} post={p} locale={params.locale} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900">
              <span className="relative z-10 flex items-center gap-2">
                {t.showMore}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}