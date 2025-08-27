import { getPostBySlug, getAllSlugs, getRelated } from "@/lib/data";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import { SearchModalWrapper } from "@/components/SearchModalWrapper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BackButton } from "@/components/BackButton";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleSchema, BreadcrumbSchema } from "@/components/StructuredData";
import Link from "next/link";
import type { Metadata } from "next";
import type { Post } from "@/lib/types";

export const revalidate = 120;

// КАЧЕСТВЕННЫЙ КОНТЕНТ - ТЕХНОЛОГИЧЕСКИЕ СТАТЬИ
const mockPosts: Post[] = [
  {
    id: "1",
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content, offering unprecedented spatial computing capabilities.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    imageAlt: "Person using Apple Vision Pro mixed reality headset in a modern office environment",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-13T10:00:00Z",
    content: `<h2>The Future is Here</h2>
    <p>Apple Vision Pro represents a quantum leap in spatial computing, blending the digital and physical worlds in ways we've never experienced before. This revolutionary device doesn't just display content – it creates immersive environments that respond to your presence, gestures, and intentions.</p>
    
    <h3>Unprecedented Visual Fidelity</h3>
    <p>With micro-OLED displays delivering more pixels than a 4K TV to each eye, Vision Pro creates incredibly sharp, clear, and lifelike images. The advanced display system, combined with custom Apple silicon, ensures that virtual objects appear naturally in your real environment.</p>
    
    <h3>Intuitive Interaction</h3>
    <p>Gone are the days of controllers and complex interfaces. Vision Pro responds to your eyes, hands, and voice, making interaction as natural as looking and touching. The precision eye tracking allows for seamless navigation, while hand tracking enables direct manipulation of digital objects.</p>
    
    <h3>Applications Beyond Entertainment</h3>
    <p>While gaming and media consumption are obvious applications, Vision Pro's true potential lies in productivity, education, and collaboration. Imagine conducting virtual meetings where participants feel truly present, or learning complex subjects through immersive 3D models.</p>
    
    <p>Apple Vision Pro is not just another gadget – it's a glimpse into the future of human-computer interaction. As developers continue to create innovative applications for the platform, we're only beginning to scratch the surface of what's possible in the age of spatial computing.</p>`
  },
  {
    id: "2", 
    slug: "ai-breakthrough-gpt5-understanding-multimodal-intelligence",
    title: "AI Breakthrough: GPT-5 and the Future of Multimodal Intelligence",
    excerpt: "The next generation of AI models promises unprecedented understanding across text, images, audio, and video, marking a new era in artificial intelligence.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    imageAlt: "Futuristic AI brain concept with neural networks and digital connections",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-13T10:00:00Z",
    content: `<h2>Beyond Language Models</h2>
    <p>GPT-5 represents a fundamental shift from traditional language models to truly multimodal AI systems. Unlike its predecessors that primarily processed text, GPT-5 can seamlessly understand and generate content across multiple modalities – text, images, audio, and video – creating a more holistic understanding of human communication.</p>
    
    <h3>Revolutionary Architecture</h3>
    <p>The architecture behind GPT-5 incorporates advanced transformer networks specifically designed for cross-modal understanding. This allows the model to not just process different types of content separately, but to understand the relationships and context between visual, auditory, and textual information.</p>
    
    <h3>Real-World Applications</h3>
    <p>The implications are staggering: AI assistants that can watch a video, listen to audio commentary, read related documents, and provide comprehensive summaries. Creative tools that can generate consistent multimedia content across different formats. Educational systems that adapt to individual learning styles through multiple sensory channels.</p>
    
    <h3>Ethical Considerations</h3>
    <p>With such powerful capabilities comes significant responsibility. GPT-5's ability to generate highly realistic multimedia content raises important questions about authenticity, copyright, and the potential for misuse. The development team has implemented robust safety measures and watermarking technologies to address these concerns.</p>
    
    <p>As we stand at the threshold of true artificial general intelligence, GPT-5 represents not just a technological advancement, but a paradigm shift that will reshape how we interact with machines and process information in the digital age.</p>`
  },
  {
    id: "3",
    slug: "quantum-computing-breakthrough-ibm-1000-qubit-processor",
    title: "Quantum Computing Breakthrough: IBM's 1000+ Qubit Processor",
    excerpt: "IBM achieves a major milestone in quantum computing with their latest 1000+ qubit processor, bringing us closer to practical quantum applications.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    imageAlt: "Quantum computer with glowing quantum bits and complex circuitry",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-12T14:30:00Z",
    content: `<h2>The Quantum Leap</h2>
    <p>IBM's latest quantum processor, featuring over 1000 qubits, represents a monumental achievement in quantum computing. This milestone brings us significantly closer to achieving quantum advantage in real-world applications, moving beyond theoretical possibilities to practical implementations.</p>
    
    <h3>Technical Marvel</h3>
    <p>The 1000+ qubit processor utilizes advanced superconducting technology, operating at temperatures colder than outer space. Each qubit is carefully isolated and controlled using precision microwave pulses, creating a delicate quantum system that can perform calculations impossible for classical computers.</p>
    
    <h3>Potential Applications</h3>
    <p>With this level of quantum processing power, we're approaching the threshold where quantum computers can tackle problems in drug discovery, financial modeling, and cryptography that would take classical computers millennia to solve. The implications for scientific research and industrial applications are profound.</p>
    
    <h3>Challenges Ahead</h3>
    <p>Despite this breakthrough, significant challenges remain. Quantum error correction, coherence times, and the development of quantum algorithms suitable for near-term devices are active areas of research. IBM's achievement represents progress in hardware, but the full potential of quantum computing will require advances across the entire stack.</p>
    
    <p>As quantum computing transitions from laboratory curiosity to industrial reality, IBM's 1000+ qubit processor stands as a testament to human ingenuity and our relentless pursuit of computational supremacy.</p>`
  }
];

// Функция для поиска поста по slug
function getPostBySlugFromMocks(slug: string): Post | null {
  return mockPosts.find(post => post.slug === slug) || null;
}

// Функция для получения связанных постов
function getRelatedFromMocks(categorySlug: string, currentSlug: string, limit: number = 3): Post[] {
  return mockPosts
    .filter(post => post.category.slug === categorySlug && post.slug !== currentSlug)
    .slice(0, limit);
}

// ВРЕМЕННО ОТКЛЮЧЕНО пока DNS не стабилизируется
// export async function generateStaticParams() {
//   const slugs = await getAllSlugs();
//   const locales = ['en', 'pl', 'de', 'ro', 'cs'];
//   
//   // Generate params for all locale/slug combinations
//   return locales.flatMap(locale => 
//     slugs.map(slug => ({ locale, slug }))
//   );
// }

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  // Пробуем получить из GraphQL, если не получается - используем моки
  let post: Post | null = null;
  
  try {
    post = await getPostBySlug(params.slug);
  } catch (error) {
    console.error('GraphQL Error, using mock data:', error);
  }
  
  if (!post) {
    post = getPostBySlugFromMocks(params.slug);
  }
  
  if (!post) return {};

  const publishedTime = new Date(post.publishedAt || post.date || new Date()).toISOString();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/${params.locale}/article/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt || `${post.title} - detailed article on icoffio`,
    keywords: `${post.category.name}, technology, ${post.title}`,
    authors: [{ name: "icoffio Team" }],
    openGraph: {
      title: post.title,
      description: post.excerpt || `${post.title} - detailed article on icoffio`,
      url,
      siteName: "icoffio",
      images: [
        {
          url: post.image || "/og.png",
          width: 1200,
          height: 630,
          alt: post.imageAlt || post.title,
        },
      ],
      locale: params.locale === 'en' ? 'en_US' : `${params.locale}_${params.locale.toUpperCase()}`,
      type: "article",
      publishedTime,
      section: post.category.name,
      tags: [post.category.name, "technology"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || `${post.title} - detailed article on icoffio`,
      images: [post.image || "/og.png"],
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
      canonical: url,
    },
  };
}

export default async function Article({ params }: { params: { locale: string; slug: string } }) {
  // Пробуем получить из GraphQL, если не получается - используем моки
  let post: Post | null = null;
  let related: Post[] = [];
  
  try {
    post = await getPostBySlug(params.slug);
    if (post) {
      related = await getRelated(post.category, post.slug, 4);
    }
  } catch (error) {
    console.error('GraphQL Error, using mock data:', error);
  }
  
  if (!post) {
    post = getPostBySlugFromMocks(params.slug);
    if (post) {
      related = getRelatedFromMocks(post.category.slug, post.slug, 4);
    }
  }
  
  if (!post) return notFound();
  
  const fallback = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  const breadcrumbItems = [
    { label: post.category.name, href: `/${params.locale}/category/${post.category.slug}` },
    { label: post.title }
  ];

  return (
    <>
      <ArticleSchema post={post} locale={params.locale} />
      <BreadcrumbSchema items={breadcrumbItems} locale={params.locale} />
              <Container>
          <div className="flex items-center justify-between mb-4">
            <BackButton locale={params.locale} />
          </div>
          <Breadcrumbs items={breadcrumbItems} locale={params.locale} />
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link 
                href={`/${params.locale}/category/${post.category.slug}`} 
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {post.category.name}
              </Link>
              <time 
                dateTime={post.publishedAt || post.date} 
                className="text-sm text-neutral-500 dark:text-neutral-400"
              >
                {new Date(post.publishedAt || post.date || new Date()).toLocaleDateString(params.locale === 'en' ? 'en-US' : 'ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-neutral-900 dark:text-neutral-100 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {post.excerpt}
            </p>
          </header>

          <div className="mb-8">
            <img 
              src={post.image || fallback} 
              alt={post.imageAlt || post.title} 
              className="w-full rounded-xl aspect-[16/9] object-cover" 
            />
          </div>

          <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
            {post.content ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : post.contentHtml ? (
              <Prose html={post.contentHtml} />
            ) : (
              <p className="text-neutral-600 dark:text-neutral-300">Content not available.</p>
            )}
          </div>
        </article>

        <RelatedArticles 
          posts={related}
          locale={params.locale}
          currentPostSlug={post.slug}
        />
      </Container>

      <SearchModalWrapper posts={mockPosts} locale={params.locale} />
    </>
  );
}