/**
 * 📦 MOCK DATA - icoffio v7.30.0
 * 
 * Centralized mock/fallback data for the application
 * Used when API/database is unavailable
 * 
 * IMPORTANT: This data is used as fallback only
 * Real data comes from Supabase/WordPress
 */

import type { Post, Category } from './types';

// ========== CATEGORIES ==========

export const mockCategories: Category[] = [
  { name: "AI", slug: "ai" },
  { name: "Apple", slug: "apple" },
  { name: "Digital", slug: "digital" },
  { name: "Tech", slug: "tech" },
  { name: "News", slug: "news" }
];

// ========== FEATURED ARTICLES (SHORT VERSION) ==========

/**
 * Short mock posts for homepage/listings
 * Used as fallback when API is unavailable
 */
export const mockPostsShort: Post[] = [
  {
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content, offering unprecedented spatial computing capabilities.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Person using Apple Vision Pro mixed reality headset",
    category: { name: "Apple", slug: "apple" },
    publishedAt: "2025-01-13T10:00:00Z",
  },
  {
    slug: "ai-breakthrough-gpt5-understanding-multimodal-intelligence",
    title: "AI Breakthrough: GPT-5 and the Future of Multimodal Intelligence",
    excerpt: "The next generation of AI models promises unprecedented understanding across text, images, audio, and video, marking a new era in artificial intelligence.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Futuristic AI brain concept with neural networks",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-13T10:00:00Z",
  },
  {
    slug: "quantum-computing-breakthrough-ibm-1000-qubit-processor",
    title: "Quantum Computing Breakthrough: IBM's 1000+ Qubit Processor",
    excerpt: "IBM achieves a major milestone in quantum computing with their latest 1000+ qubit processor, bringing us closer to practical quantum applications.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Quantum computer with glowing quantum bits",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-12T14:30:00Z",
  },
  {
    slug: "metaverse-evolution-beyond-virtual-reality",
    title: "The Metaverse Evolution: Beyond Virtual Reality",
    excerpt: "From gaming worlds to digital workspaces, the metaverse is reshaping human interaction and creating new economic opportunities in virtual environments.",
    image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Virtual reality metaverse environment",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-12T14:30:00Z",
  },
  {
    slug: "cybersecurity-2024-ai-powered-defense-systems",
    title: "Cybersecurity 2024: AI-Powered Defense Systems",
    excerpt: "Advanced AI systems are now protecting against sophisticated cyber threats, offering real-time threat detection and automated response capabilities.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Cybersecurity concept with digital locks",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-11T16:20:00Z",
  },
  {
    slug: "sustainable-tech-green-computing-revolution",
    title: "Sustainable Tech: The Green Computing Revolution",
    excerpt: "Technology companies are pioneering eco-friendly solutions, from renewable energy data centers to biodegradable electronics.",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Green technology concept with renewable energy",
    category: { name: "News", slug: "news" },
    publishedAt: "2025-01-11T16:20:00Z",
  },
  {
    slug: "neural-interfaces-brain-computer-connections",
    title: "Neural Interfaces: The Future of Brain-Computer Connections",
    excerpt: "Revolutionary brain-computer interfaces are enabling direct neural control of digital devices, opening new possibilities for human enhancement.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Neural brain interface technology",
    category: { name: "AI", slug: "ai" },
    publishedAt: "2025-01-10T12:45:00Z",
  },
  {
    slug: "web3-decentralized-internet-revolution",
    title: "Web3: The Decentralized Internet Revolution",
    excerpt: "Web3 technologies are creating a more open, user-controlled internet where privacy and data ownership take center stage.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Web3 blockchain technology concept",
    category: { name: "Digital", slug: "digital" },
    publishedAt: "2025-01-10T12:45:00Z",
  },
  {
    slug: "robotics-automation-manufacturing-transformation",
    title: "Robotics & Automation: Manufacturing Transformation",
    excerpt: "Advanced robotics and AI automation are revolutionizing manufacturing, creating smarter, more efficient production systems.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Advanced robotics in manufacturing",
    category: { name: "Tech", slug: "tech" },
    publishedAt: "2025-01-09T09:15:00Z",
  }
];

// ========== FULL ARTICLE CONTENT ==========

/**
 * Full mock posts with complete content
 * Used for article pages when API is unavailable
 */
export const mockPostsFull: Post[] = [
  {
    id: "1",
    slug: "apple-vision-pro-2024-revolutionizing-spatial-computing",
    title: "Apple Vision Pro 2024: Revolutionizing Spatial Computing",
    excerpt: "Apple's groundbreaking mixed reality headset is transforming how we interact with digital content, offering unprecedented spatial computing capabilities that promise to reshape our digital future.",
    image: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Person using Apple Vision Pro mixed reality headset in a modern office environment",
    category: { name: "Apple", slug: "apple" },
    tags: [
      { name: "Mixed Reality", slug: "mixed-reality" },
      { name: "Spatial Computing", slug: "spatial-computing" },
      { name: "Apple Vision Pro", slug: "apple-vision-pro" },
    ],
    publishedAt: "2025-01-13T10:00:00Z",
    content: `
<h2>The Dawn of Spatial Computing Era</h2>
<p>Apple Vision Pro represents far more than just another technological device – it embodies a fundamental paradigm shift that redefines the very nature of human-computer interaction. This revolutionary mixed reality headset seamlessly blends the physical and digital realms, creating an entirely new category of computing that Apple calls "spatial computing."</p>

<p>Unlike traditional screens that confine our digital experiences to flat surfaces, Vision Pro liberates digital content, allowing it to exist naturally within our three-dimensional world. This isn't merely an incremental improvement over existing VR headsets; it's a complete reimagining of how we engage with technology in our daily lives.</p>

<h3>Revolutionary Display Technology</h3>
<p>At the heart of Vision Pro lies an extraordinary display system that delivers unprecedented visual fidelity. Each eye receives input from custom micro-OLED displays containing more pixels than a 4K television. This remarkable pixel density of 23 million pixels total creates images so crisp and lifelike that virtual objects seamlessly integrate with the real world.</p>

<h3>Natural and Intuitive Interaction</h3>
<p>Perhaps even more revolutionary than the display technology is Vision Pro's approach to user interaction. Apple has completely eliminated the need for traditional controllers, instead relying on a sophisticated combination of eye tracking, hand recognition, and voice commands that make interaction feel as natural as looking and touching physical objects.</p>

<h3>Enterprise and Professional Applications</h3>
<p>While consumer applications are compelling, Vision Pro's true potential may lie in professional and enterprise environments. Architects can walk through buildings before they're constructed, surgeons can practice complex procedures in risk-free virtual environments, and engineers can manipulate 3D models with unprecedented precision.</p>

<h3>The Spatial Computing Future</h3>
<p>Apple Vision Pro isn't just a product launch – it's the opening chapter of the spatial computing era. As the technology matures and becomes more accessible, we'll see fundamental changes in how we work, learn, communicate, and entertain ourselves.</p>`
  },
  {
    id: "2",
    slug: "ai-breakthrough-gpt5-understanding-multimodal-intelligence",
    title: "AI Breakthrough: GPT-5 and the Future of Multimodal Intelligence",
    excerpt: "The next generation of AI models promises unprecedented understanding across text, images, audio, and video, marking a new era in artificial intelligence.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Futuristic AI brain concept with neural networks and digital connections",
    category: { name: "AI", slug: "ai" },
    tags: [
      { name: "GPT-5", slug: "gpt-5" },
      { name: "Multimodal AI", slug: "multimodal-ai" },
      { name: "Artificial Intelligence", slug: "artificial-intelligence" },
    ],
    publishedAt: "2025-01-13T10:00:00Z",
    content: `
<h2>The Multimodal Revolution</h2>
<p>GPT-5 represents the most significant leap in artificial intelligence since the introduction of the transformer architecture. Unlike its predecessors that excelled primarily in text processing, GPT-5 introduces true multimodal capabilities that allow it to understand, process, and generate content across multiple formats simultaneously – text, images, audio, and video.</p>

<h3>Architectural Innovations</h3>
<p>The technical foundation of GPT-5 represents a complete reimagining of how AI systems process information. The new architecture employs specialized attention mechanisms that can simultaneously track relationships within text, spatial relationships in images, temporal patterns in audio, and sequential understanding in video.</p>

<h3>Revolutionary Capabilities</h3>
<p>The practical implications of GPT-5's capabilities are staggering. The model can analyze a complex scientific diagram, understand the underlying concepts, and then explain them in multiple ways – through text, by generating clarifying images, or even by creating educational videos.</p>

<h3>Impact on Creative Industries</h3>
<p>The creative industries are already beginning to feel the transformative impact of GPT-5's multimodal capabilities. Film studios are using the technology to generate concept art that perfectly matches script descriptions.</p>`
  },
  {
    id: "3",
    slug: "quantum-computing-breakthrough-ibm-1000-qubit-processor",
    title: "Quantum Computing Breakthrough: IBM's 1000+ Qubit Processor",
    excerpt: "IBM achieves a major milestone in quantum computing with their latest 1000+ qubit processor, bringing us closer to practical quantum applications.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Quantum computer with glowing quantum bits and complex circuitry",
    category: { name: "Tech", slug: "tech" },
    tags: [
      { name: "Quantum Computing", slug: "quantum-computing" },
      { name: "IBM", slug: "ibm" },
      { name: "Qubits", slug: "qubits" },
    ],
    publishedAt: "2025-01-12T14:30:00Z",
    content: `
<h2>The Quantum Computing Revolution</h2>
<p>IBM's achievement of creating a quantum processor with over 1000 qubits represents one of the most significant milestones in the history of computing. This breakthrough brings us tantalizingly close to achieving practical quantum advantage.</p>

<h3>The Physics of Quantum Supremacy</h3>
<p>At its core, quantum computing harnesses the bizarre principles of quantum mechanics – superposition, entanglement, and interference – to process information in ways that classical computers cannot.</p>

<h3>Practical Applications on the Horizon</h3>
<p>With 1000+ qubits, IBM's quantum processor approaches the threshold where it can tackle problems with genuine commercial and scientific value. Drug discovery represents one of the most promising near-term applications.</p>`
  },
  {
    id: "4",
    slug: "metaverse-evolution-beyond-virtual-reality",
    title: "The Metaverse Evolution: Beyond Virtual Reality",
    excerpt: "From gaming worlds to digital workspaces, the metaverse is reshaping human interaction and creating new economic opportunities.",
    image: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Virtual reality metaverse environment with digital avatars",
    category: { name: "Digital", slug: "digital" },
    tags: [
      { name: "Metaverse", slug: "metaverse" },
      { name: "Virtual Reality", slug: "virtual-reality" },
    ],
    publishedAt: "2025-01-12T14:30:00Z",
    content: `
<h2>The Digital Renaissance</h2>
<p>The metaverse represents the most significant evolution in digital interaction since the advent of the internet itself. What began as science fiction concepts has transformed into a tangible digital reality.</p>

<h3>Economic Transformation</h3>
<p>Perhaps the most remarkable aspect of the metaverse evolution is the emergence of legitimate digital economies. Virtual real estate transactions now involve millions of dollars.</p>`
  },
  {
    id: "5",
    slug: "cybersecurity-2024-ai-powered-defense-systems",
    title: "Cybersecurity 2024: AI-Powered Defense Systems",
    excerpt: "Advanced AI systems are now protecting against sophisticated cyber threats, offering real-time threat detection and automated response capabilities.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Cybersecurity concept with digital locks and data protection",
    category: { name: "Tech", slug: "tech" },
    tags: [
      { name: "Cybersecurity", slug: "cybersecurity" },
      { name: "AI Security", slug: "ai-security" },
    ],
    publishedAt: "2025-01-11T16:20:00Z",
    content: `
<h2>The AI Security Revolution</h2>
<p>The cybersecurity landscape has undergone a fundamental transformation as artificial intelligence emerges as both the most powerful defense mechanism and the most sophisticated attack vector in digital security.</p>

<h3>Machine Learning Threat Detection</h3>
<p>Modern AI security systems employ sophisticated machine learning algorithms that continuously learn from network behavior, user patterns, and threat intelligence feeds.</p>`
  }
];

// ========== HELPER FUNCTIONS ==========

/**
 * Get mock post by slug (full content version)
 */
export function getMockPostBySlug(slug: string): Post | null {
  return mockPostsFull.find(post => post.slug === slug) || null;
}

/**
 * Get related mock posts by category
 */
export function getRelatedMockPosts(categorySlug: string, currentSlug: string, limit: number = 3): Post[] {
  return mockPostsFull
    .filter(post => post.category.slug === categorySlug && post.slug !== currentSlug)
    .slice(0, limit);
}

/**
 * Get mock posts for homepage (short version)
 */
export function getMockPostsForHomepage(limit: number = 9): Post[] {
  return mockPostsShort.slice(0, limit);
}

