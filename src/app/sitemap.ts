import type { MetadataRoute } from "next";

const SITE_URL = "https://sshakil.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // The portfolio is a single-page site; the public surface is just the
  // homepage. Section anchors (#skills, #experience, …) are not separate
  // indexable URLs, so Google is intentionally pointed at "/" only.
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
