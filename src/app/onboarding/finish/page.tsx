import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

/**
 * Part 3 of onboarding: the finishing touches — photo, bio, contact, socials,
 * details — on a page that is already live with its first offer.
 *
 * Reached from the offer builder once the offer is published. Nothing ever
 * redirects here: a coach who leaves halfway finds the dashboard next time,
 * where every one of these is editable. Before the offer exists there is
 * nothing to dress yet, so the first offer comes first.
 */
export default async function OnboardingFinishPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding/profile");
  if (!profile.onboarding_completed_at) redirect("/onboarding/offer");

  const supabase = await createSupabaseServerClient();
  // Only the coach's own activity: it words the bio's placeholder.
  const { data: category } = profile.category_id
    ? await supabase
        .from("activity_categories")
        .select("id, slug, name, icon, config")
        .eq("id", profile.category_id)
        .maybeSingle()
    : { data: null };

  return (
    <ProfileSetupForm
      part="finish"
      categories={category ? [category] : []}
      linkBase={siteUrl.replace(/^https?:\/\//, "")}
      existing={{
        categoryId: profile.category_id,
        displayName: profile.display_name,
        slug: profile.slug,
      }}
      publicUrl={absoluteUrl(`/${profile.slug}`, siteUrl)}
    />
  );
}
