import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/flow";
import { getCurrentProfile, getOnboardingStep, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { themeForCategory } from "@/lib/onboarding/config";
import { slugFromParam } from "@/lib/onboarding/slug";
import { loadPagePreview } from "@/lib/page/preview";
import { getTheme } from "@/lib/page/themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The sign-up. The server works out the step — from the account's data, then
 * its stored progress — and the flow opens there: whoever left halfway comes
 * back to the screen they stopped at, and a finished account is never shown
 * any of it again.
 */
export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const step = await getOnboardingStep();
  if (step === "done") redirect("/dashboard");

  const profile = await getCurrentProfile();
  if (profile?.suspended_at || profile?.deleted_at) redirect("/suspended");

  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: progress }] = await Promise.all([
    supabase
      .from("activity_categories")
      .select("id, slug, name, icon")
      .eq("is_active", true)
      .order("position"),
    supabase.from("onboarding_progress").select("category_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const categoryId = profile?.category_id ?? progress?.category_id ?? null;
  const categorySlug = categories?.find((item) => item.id === categoryId)?.slug ?? null;
  const preview =
    step === "appearance" && profile ? await loadPagePreview(supabase, profile) : null;

  return (
    <OnboardingFlow
      initialStep={step}
      categories={categories ?? []}
      initialCategoryId={categoryId}
      identity={profile ? { displayName: profile.display_name, slug: profile.slug } : null}
      linkBase={siteUrl.replace(/^https?:\/\//, "")}
      contactEmail={profile?.contact_email ?? user.email ?? null}
      initialPreview={preview}
      initialTheme={profile ? getTheme(profile.theme).id : themeForCategory(categorySlug)}
      initialSlug={slugFromParam((await searchParams).slug)}
    />
  );
}
