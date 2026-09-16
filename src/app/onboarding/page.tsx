import { redirect } from "next/navigation";

import { getCurrentProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Sends the pro to the step they still have to complete. */
export default async function OnboardingRouter() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) redirect("/onboarding/profile");
  if (profile.onboarding_completed_at) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  redirect((count ?? 0) > 0 ? "/onboarding/share" : "/onboarding/offer");
}
