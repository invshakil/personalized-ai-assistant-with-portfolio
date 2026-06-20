import type { MetadataRoute } from "next";

const SITE_URL = "https://sshakil.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private admin surface and API handlers must never be indexed.
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
