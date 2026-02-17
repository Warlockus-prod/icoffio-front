import type { Post } from "@/lib/types";
import { buildSiteUrl, getSiteBaseUrl } from "@/lib/site-url";

function localeToLanguage(locale: string): string {
  return locale === "pl" ? "pl-PL" : "en-US";
}

function toAbsoluteUrl(input?: string): string {
  const value = (input || "").trim();
  if (!value) return buildSiteUrl("/og.png");
  if (/^https?:\/\//i.test(value)) return value;
  return buildSiteUrl(value.startsWith("/") ? value : `/${value}`);
}

function stripText(input: string): string {
  return (input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface WebsiteSchemaProps {
  locale: string;
}

export function WebsiteSchema({ locale }: WebsiteSchemaProps) {
  const siteUrl = getSiteBaseUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "icoffio",
    description: "Technology news, reviews, and articles about Apple, AI, games and new technologies",
    url: `${siteUrl}/${locale}`,
    inLanguage: localeToLanguage(locale),
    publisher: {
      "@type": "Organization",
      name: "icoffio",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: buildSiteUrl("/logo.svg"),
        width: 512,
        height: 512,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ArticleSchemaProps {
  post: Post;
  locale: string;
}

export function ArticleSchema({ post, locale }: ArticleSchemaProps) {
  const publishedDate = new Date(post.publishedAt || post.date || Date.now()).toISOString();
  const articleUrl = buildSiteUrl(`/${locale}/article/${post.slug}`);
  const imageUrl = toAbsoluteUrl(post.image);
  const description = stripText(post.excerpt || post.title || "");
  const plainContent = stripText(post.contentHtml || post.content || "");
  const wordCount = plainContent ? plainContent.split(" ").filter(Boolean).length : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description,
    image: [imageUrl],
    datePublished: publishedDate,
    dateModified: publishedDate,
    inLanguage: localeToLanguage(locale),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    url: articleUrl,
    isAccessibleForFree: true,
    articleSection: post.category.name,
    author: [
      {
        "@type": "Organization",
        name: "icoffio Editorial Team",
        url: getSiteBaseUrl(),
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "icoffio",
      url: getSiteBaseUrl(),
      logo: {
        "@type": "ImageObject",
        url: buildSiteUrl("/logo.svg"),
        width: 512,
        height: 512,
      },
    },
    ...(wordCount ? { wordCount } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ label: string; href?: string }>;
  locale: string;
}

export function BreadcrumbSchema({ items, locale }: BreadcrumbSchemaProps) {
  const homeLabel = locale === "pl" ? "Strona glowna" : "Home";
  const allItems = [{ label: homeLabel, href: `/${locale}` }, ...items];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: buildSiteUrl(item.href) } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface OrganizationSchemaProps {
  locale: string;
}

export function OrganizationSchema({ locale }: OrganizationSchemaProps) {
  const siteUrl = getSiteBaseUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "icoffio",
    alternateName: "icoffio Tech News",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: buildSiteUrl("/logo.svg"),
      width: 512,
      height: 512,
    },
    image: {
      "@type": "ImageObject",
      url: buildSiteUrl("/og.png"),
      width: 1200,
      height: 630,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "gtframestudioai@gmail.com",
      availableLanguage: ["English", "Polish"],
    },
    publishingPrinciples: buildSiteUrl(`/${locale}/editorial`),
    inLanguage: localeToLanguage(locale),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
