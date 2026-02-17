import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/_next/image/"],
        disallow: ["/api/", "/en/admin", "/pl/admin"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
