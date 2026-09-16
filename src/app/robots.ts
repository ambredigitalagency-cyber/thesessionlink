import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas and one-off client links stay out of search results.
      disallow: ["/dashboard", "/onboarding", "/booking/", "/api/", "/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
