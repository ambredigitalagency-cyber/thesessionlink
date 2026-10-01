import { redirect } from "next/navigation";

import { FirstOfferForm } from "@/components/onboarding/first-offer-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { localized, parseCategoryConfig } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Part 2 of onboarding: the first offer. Reached once the link is reserved;
 * an account whose onboarding is complete — it already published an offer,
 * or finished the earlier, profile-first flow — is never sent back here.
 *
 * Like the profile step, the page is only the data: the builder carries the
 * progress bar and the heading because both change with every question.
 */
export default async function OnboardingOfferPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding/profile");
  if (profile.onboarding_completed_at) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const [{ data: category }, { data: rules }] = await Promise.all([
    profile.category_id
      ? supabase
          .from("activity_categories")
          .select("name, config")
          .eq("id", profile.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("availabilities")
      .select("weekday, start_time, end_time")
      .eq("profile_id", profile.id)
      .is("offer_id", null),
  ]);

  const config = parseCategoryConfig(category?.config);

  return (
    <FirstOfferForm
      categoryFields={config.suggested_fields}
      template={
        category
          ? { category: localized(category.name, profile.locale, ""), fields: config.templates }
          : undefined
      }
      suggestedActionType={config.default_action_type}
      currency={profile.currency}
      locale={profile.locale}
      profileWhatsapp={profile.whatsapp_number}
      savedHours={rules}
    />
  );
}
