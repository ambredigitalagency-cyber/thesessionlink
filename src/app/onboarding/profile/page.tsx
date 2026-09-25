import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The step is walked question by question, so the progress bar and the heading
 * belong to the form: both change on every phase, and neither can be rendered
 * here without shipping the phase state back up to the server component.
 */
export default async function OnboardingProfilePage() {
  await requireUser();
  if (await getCurrentProfile()) redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("activity_categories")
    .select("id, slug, name, icon, config")
    .eq("is_active", true)
    .order("position");

  return (
    <ProfileSetupForm
      categories={categories ?? []}
      linkBase={siteUrl.replace(/^https?:\/\//, "")}
    />
  );
}
