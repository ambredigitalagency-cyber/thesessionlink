import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The step is walked question by question, so the progress bar and the heading
 * belong to the form: both change on every phase, and neither can be rendered
 * here without shipping the phase state back up to the server component.
 *
 * The profile row is written halfway through, at the link. Someone who comes
 * back after that is not sent away — the screens that follow the link are the
 * ones enriching a profile that already exists, and that is where they resume.
 * Only a finished onboarding is turned around.
 */
export default async function OnboardingProfilePage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (profile?.onboarding_completed_at) redirect("/dashboard");

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
      existing={
        profile
          ? {
              categoryId: profile.category_id,
              displayName: profile.display_name,
              slug: profile.slug,
            }
          : null
      }
    />
  );
}
