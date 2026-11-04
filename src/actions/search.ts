"use server";

import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * What the command palette searches: the coach's offers, by title.
 *
 * Queried on demand rather than shipped with the page. Reads go through the
 * coach's own session, so the existing row-level policies decide what can be
 * found — the palette cannot become a way to look at someone else's offers.
 */

export type SearchHit = {
  kind: "offer";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const LIMIT = 8;

/** Escapes the wildcards PostgREST's `ilike` would otherwise interpret. */
function pattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, (match) => `\\${match}`)}%`;
}

export async function searchDashboard(rawQuery: string): Promise<SearchHit[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const profile = await requireOnboardedProfile();
  const supabase = await createSupabaseServerClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, title")
    .eq("profile_id", profile.id)
    .ilike("title", pattern(query))
    .limit(LIMIT);

  return (offers ?? []).map((offer) => ({
    kind: "offer",
    id: offer.id,
    title: offer.title,
    subtitle: null,
    href: `/dashboard/offers/${offer.id}`,
  }));
}
