"use server";

import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * What the command palette searches.
 *
 * Queried on demand rather than shipped with the page: a coach with three
 * hundred clients should not pay for them in the dashboard bundle just in case
 * they press Cmd+K. Reads go through the coach's own session, so the existing
 * row-level policies decide what can be found — the palette cannot become a
 * way to look at someone else's clients.
 */

export type SearchHit = {
  kind: "offer" | "client" | "booking";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const PER_KIND = 5;

/** Escapes the wildcards PostgREST's `ilike` would otherwise interpret. */
function pattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, (match) => `\\${match}`)}%`;
}

export async function searchDashboard(rawQuery: string): Promise<SearchHit[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const profile = await requireOnboardedProfile();
  const supabase = await createSupabaseServerClient();
  const like = pattern(query);

  const [offers, clients, bookings] = await Promise.all([
    supabase
      .from("offers")
      .select("id, title, action_type")
      .eq("profile_id", profile.id)
      .ilike("title", like)
      .limit(PER_KIND),
    supabase
      .from("clients")
      .select("id, name, email")
      .eq("profile_id", profile.id)
      .or(`name.ilike.${like},email.ilike.${like}`)
      .limit(PER_KIND),
    supabase
      .from("bookings")
      .select("id, client_name, offer_title, starts_at, client_id")
      .eq("profile_id", profile.id)
      .or(`client_name.ilike.${like},offer_title.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(PER_KIND),
  ]);

  const hits: SearchHit[] = [];

  for (const offer of offers.data ?? []) {
    hits.push({
      kind: "offer",
      id: offer.id,
      title: offer.title,
      subtitle: null,
      href: `/dashboard/offers/${offer.id}`,
    });
  }

  for (const client of clients.data ?? []) {
    hits.push({
      kind: "client",
      id: client.id,
      title: client.name,
      subtitle: client.email,
      href: `/dashboard/bookings/clients/${client.id}`,
    });
  }

  for (const booking of bookings.data ?? []) {
    hits.push({
      kind: "booking",
      id: booking.id,
      title: booking.client_name,
      subtitle: booking.offer_title,
      // Bookings open in a panel on the list, addressed by id.
      href: `/dashboard/bookings?open=${booking.id}`,
    });
  }

  return hits;
}
