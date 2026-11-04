import { getTranslations } from "next-intl/server";

import type { TrackingSource } from "@/actions/tracking";
import { TrackingLinks } from "@/components/stats/tracking-links";
import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { getTheme } from "@/lib/page/themes";
import { parseStats } from "@/lib/tracking/stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("stats.tabs");
  return { title: t("links") };
}

/** My tracking links: one link and one QR per place the page is shared, with their last 30 days. */
export default async function TrackingLinksPage() {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("stats.links");
  const supabase = await createSupabaseServerClient();

  const [{ data: sources }, { data: raw }] = await Promise.all([
    supabase
      .from("tracking_sources")
      .select("id, slug, label, kind")
      .eq("profile_id", profile.id)
      .order("created_at"),
    supabase.rpc("page_stats", { p_profile_id: profile.id, p_days: 30 }),
  ]);
  const stats = parseStats(raw);
  const counts = Object.fromEntries(
    stats.sources.map((source) => [
      source.source,
      { views: source.views, contacts: source.contacts },
    ]),
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-[15px]">{t("subtitle")}</p>
      </header>
      <TrackingLinks
        initialSources={(sources ?? []) as TrackingSource[]}
        counts={counts}
        slug={profile.slug}
        siteUrl={siteUrl}
        displayName={profile.display_name}
        accent={profile.accent_color}
        theme={getTheme(profile.theme).id}
      />
    </>
  );
}
