import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Part 1 of onboarding: activity, name, link. The profile row is written at
 * the link, so this page only ever serves someone without one; a reserved
 * link moves on to the first offer, a finished onboarding to the dashboard.
 *
 * The step is walked question by question, so the progress bar and the heading
 * belong to the form: both change on every phase.
 */
export default async function OnboardingProfilePage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (profile?.onboarding_completed_at) redirect("/dashboard");
  if (profile) redirect("/onboarding/offer");

  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("activity_categories")
    .select("id, slug, name, icon, config")
    .eq("is_active", true)
    .order("position");

  return (
    <ProfileSetupForm
      part="identity"
      categories={categories ?? []}
      linkBase={siteUrl.replace(/^https?:\/\//, "")}
    />
  );
}
