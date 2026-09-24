import { BookingsView, type BookingRow } from "@/components/dashboard/bookings-view";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BookingsPage() {
  const profile = await requireOnboardedProfile();
  // Server Component: one stable reference time for this request, so the
  // "upcoming / past" split renders the same on the server and after hydration.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, offer_title, action_type, client_id, client_name, client_email, client_phone, client_message, starts_at, ends_at, requested_date, quantity, status, no_show, payment_status, payment_provider, payment_amount_cents, payment_currency, internal_notes, details, created_at",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <BookingsView
      bookings={(data ?? []) as BookingRow[]}
      timezone={profile.timezone}
      locale={profile.locale}
      now={now}
    />
  );
}
