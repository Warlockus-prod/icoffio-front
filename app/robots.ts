import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteBaseUrl();

  return {
    rules: [
      // Default: allow all search engines
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/_next/image/"],
        disallow: ["/api/", "/en/admin", "/pl/admin"],
      },
      // Allow AI search bots (drives traffic from AI search engines)
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: ["/"],
      },
      {
        userAgent: "Claude-SearchBot",
        allow: ["/"],
      },
      {
        userAgent: "Claude-User",
        allow: ["/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
      },
      // Block AI training crawlers (protect content from model training)
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ClaudeBot",
        disallow: ["/"],
      },
      {
        userAgent: "Google-Extended",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "Applebot-Extended",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
      {
        userAgent: "cohere-ai",
        disallow: ["/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
