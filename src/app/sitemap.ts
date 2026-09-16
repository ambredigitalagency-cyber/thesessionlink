import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

import { siteUrl, supabasePublishableKey, supabaseUrl } from "@/lib/env";

export const revalidate = 3600;

/** Landing plus every published profile — the pages we want indexed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
  ];

  if (!supabaseUrl || !supabasePublishableKey) return entries;

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });

  const { data } = await supabase.from("public_profiles").select("slug").limit(5000);

  for (const profile of data ?? []) {
    if (!profile.slug) continue;
    entries.push({
      url: `${siteUrl}/${profile.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
