import { getTranslations } from "next-intl/server";

import { StatsView } from "@/components/stats/stats-view";
import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import type { SourceKind } from "@/lib/tracking/sources";
import { parsePeriod, parseStats } from "@/lib/tracking/stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("stats") };
}

/** Statistics: every figure comes aggregated from page_stats(), in one call. */
export default async function StatsPage({ searchParams }: PageProps<"/dashboard/stats">) {
  const profile = await requireOnboardedProfile();
  const period = parsePeriod((await searchParams).days);
  const supabase = await createSupabaseServerClient();

  const [{ data, error }, { data: sources }] = await Promise.all([
    supabase.rpc("page_stats", { p_profile_id: profile.id, p_days: period }),
    supabase.from("tracking_sources").select("slug, label, kind").eq("profile_id", profile.id),
  ]);
  if (error) console.error("[stats] page_stats failed", error.code, error.message);

  return (
    <StatsView
      stats={parseStats(data)}
      period={period}
      sources={(sources ?? []).map((source) => ({ ...source, kind: source.kind as SourceKind }))}
      publicUrl={absoluteUrl(`/${profile.slug}`, siteUrl)}
      displayName={profile.display_name}
    />
  );
}
