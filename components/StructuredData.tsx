import type { Post } from "@/lib/types";

interface WebsiteSchemaProps {
  locale: string;
}

export function WebsiteSchema({ locale }: WebsiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "icoffio",
    "description": "Technology news, reviews, and articles about Apple, AI, games and new technologies",
    "url": process.env.NEXT_PUBLIC_SITE_URL,
    "inLanguage": locale,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "icoffio",
      "url": process.env.NEXT_PUBLIC_SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.svg`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://twitter.com/icoffio",
        "https://www.facebook.com/icoffio",
        "https://www.linkedin.com/company/icoffio"
      ]
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

interface ArticleSchemaProps {
  post: Post;
  locale: string;
}

export function ArticleSchema({ post, locale }: ArticleSchemaProps) {
  const publishedDate = post.publishedAt || post.date;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": {
      "@type": "ImageObject",
      "url": post.image,
      "width": 1200,
      "height": 630,
      "caption": post.imageAlt || post.title
    },
    "datePublished": publishedDate,
    "dateModified": publishedDate,
    "author": {
      "@type": "Organization",
      "name": "icoffio Team",
      "url": process.env.NEXT_PUBLIC_SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "icoffio",
      "url": process.env.NEXT_PUBLIC_SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.svg`,
        "width": 512,
        "height": 512
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/article/${post.slug}`
    },
    "articleSection": post.category.name,
    "keywords": [post.category.name, "technology", "gadgets", "news"],
    "inLanguage": locale,
    "url": `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/article/${post.slug}`
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ label: string; href?: string }>;
  locale: string;
}

export function BreadcrumbSchema({ items, locale }: BreadcrumbSchemaProps) {
  // Добавляем Home в начало
  const allItems = [
    { label: "Home", href: `/${locale}` },
    ...items
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": allItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(item.href && { "item": `${process.env.NEXT_PUBLIC_SITE_URL}${item.href}` })
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

interface OrganizationSchemaProps {
  locale: string;
}

export function OrganizationSchema({ locale }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "NewsMediaOrganization"],
    "name": "icoffio",
    "alternateName": "icoffio Tech News",
    "description": "Leading technology news, reviews, and articles about Apple, AI, games and new technologies",
    "url": process.env.NEXT_PUBLIC_SITE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.svg`,
      "width": 512,
      "height": 512
    },
    "image": {
      "@type": "ImageObject",
      "url": `${process.env.NEXT_PUBLIC_SITE_URL}/og.png`,
      "width": 1200,
      "height": 630
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "availableLanguage": ["English", "Polish", "German", "Romanian", "Czech"],
      "email": "contact@icoffio.com"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "sameAs": [
      "https://twitter.com/icoffio",
      "https://www.facebook.com/icoffio", 
      "https://www.linkedin.com/company/icoffio",
      "https://www.instagram.com/icoffio",
      "https://github.com/icoffio"
    ],
    "founder": {
      "@type": "Person",
      "name": "icoffio Editorial Team"
    },
    "foundingDate": "2024",
    "knowsAbout": [
      "Technology", "Apple products", "Artificial Intelligence", "Machine Learning",
      "Gaming", "Consumer Electronics", "Software", "Hardware Reviews",
      "Cybersecurity", "Blockchain", "Web3", "Metaverse", "Quantum Computing",
      "Robotics", "Automation", "Sustainable Technology", "Green Computing"
    ],
    "publishingPrinciples": `${process.env.NEXT_PUBLIC_SITE_URL}/editorial-policy`,
    "diversityPolicy": `${process.env.NEXT_PUBLIC_SITE_URL}/diversity-policy`,
    "ethicsPolicy": `${process.env.NEXT_PUBLIC_SITE_URL}/ethics-policy`,
    "masthead": `${process.env.NEXT_PUBLIC_SITE_URL}/about`,
    "missionCoveragePrioritiesPolicy": `${process.env.NEXT_PUBLIC_SITE_URL}/coverage-policy`,
    "verificationFactCheckingPolicy": `${process.env.NEXT_PUBLIC_SITE_URL}/fact-checking`
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// FAQ Schema for better search results
export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// Product Review Schema for tech reviews
export function ProductReviewSchema({ 
  product, 
  rating, 
  reviewBody, 
  author, 
  locale 
}: { 
  product: { name: string; brand?: string; model?: string; category?: string };
  rating: { value: number; bestRating?: number; worstRating?: number };
  reviewBody: string;
  author: string;
  locale: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "Product",
      "name": product.name,
      "brand": product.brand,
      "model": product.model,
      "category": product.category || "Technology"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": rating.value,
      "bestRating": rating.bestRating || 5,
      "worstRating": rating.worstRating || 1
    },
    "author": {
      "@type": "Person",
      "name": author
    },
    "reviewBody": reviewBody,
    "publisher": {
      "@type": "Organization",
      "name": "icoffio"
    },
    "inLanguage": locale
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

