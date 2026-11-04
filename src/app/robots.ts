import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas stay out of search results.
      disallow: ["/dashboard", "/onboarding", "/admin", "/auth/", "/api/", "/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
