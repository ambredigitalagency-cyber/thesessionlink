import { requireOnboardedProfile } from "@/lib/auth";
import { ClientsList, type ClientSummary } from "@/components/dashboard/clients-list";
import { PlanUpsell } from "@/components/dashboard/plan-upsell";
import { effectivePlan, planLimits } from "@/lib/plans/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const profile = await requireOnboardedProfile();

  // The mini CRM is a paid feature; free profiles get the upsell instead.
  if (!planLimits(profile).crm) {
    return <PlanUpsell feature="crm" currentPlan={effectivePlan(profile)} />;
  }

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
