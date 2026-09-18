import { requireOnboardedProfile } from "@/lib/auth";
import { ClientsList, type ClientSummary } from "@/components/dashboard/clients-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const profile = await requireOnboardedProfile();

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("client_summaries")
    .select("*")
    .eq("profile_id", profile.id)
    .order("last_booking_at", { ascending: false, nullsFirst: false })
    .limit(500);

  return (
    <ClientsList
      clients={(data ?? []) as ClientSummary[]}
      timezone={profile.timezone}
      locale={profile.locale}
    />
  );
}
