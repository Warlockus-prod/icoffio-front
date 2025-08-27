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
    "@type": "Organization",
    "name": "icoffio",
    "description": "Technology news, reviews, and articles about Apple, AI, games and new technologies",
    "url": process.env.NEXT_PUBLIC_SITE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.svg`,
      "width": 512,
      "height": 512
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "availableLanguage": ["English", "Polish", "German", "Romanian", "Czech"]
    },
    "sameAs": [
      "https://twitter.com/icoffio",
      "https://www.facebook.com/icoffio", 
      "https://www.linkedin.com/company/icoffio",
      "https://www.instagram.com/icoffio"
    ],
    "founder": {
      "@type": "Person",
      "name": "icoffio Team"
    },
    "foundingDate": "2024",
    "knowsAbout": [
      "Technology",
      "Apple products", 
      "Artificial Intelligence",
      "Gaming",
      "Consumer Electronics",
      "Software",
      "Hardware Reviews"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}
