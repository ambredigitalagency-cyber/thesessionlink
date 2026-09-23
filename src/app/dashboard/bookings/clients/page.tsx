import { requireOnboardedProfile } from "@/lib/auth";
import { ClientsList, type ClientSummary } from "@/components/dashboard/clients-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const profile = await requireOnboardedProfile();

  const supabase = await createSupabaseServerClient();

  // The list never loads health notes: it has no use for them.
  const { data } = await supabase
    .from("client_summaries")
    .select(
      "id, profile_id, name, email, phone, notes, tags, bookings_count, pending_count, recent_bookings_count, last_booking_at, next_session_at, spent",
    )
    .eq("profile_id", profile.id)
    .order("last_booking_at", { ascending: false, nullsFirst: false })
    .limit(500);

  // Every column of a view is nullable to Postgres; give the list solid values
  // instead of casting the nulls away.
  const clients: ClientSummary[] = (data ?? []).map((row) => ({
    id: row.id ?? "",
    profile_id: row.profile_id ?? "",
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone,
    notes: row.notes,
    tags: row.tags ?? [],
    bookings_count: row.bookings_count ?? 0,
    pending_count: row.pending_count ?? 0,
    recent_bookings_count: row.recent_bookings_count ?? 0,
    last_booking_at: row.last_booking_at,
    next_session_at: row.next_session_at,
    spent: Number(row.spent ?? 0),
  }));

  return <ClientsList clients={clients} timezone={profile.timezone} locale={profile.locale} />;
}
