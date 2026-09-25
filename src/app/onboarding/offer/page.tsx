import { redirect } from "next/navigation";

import { FirstOfferForm } from "@/components/onboarding/first-offer-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { parseCategoryConfig } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Like the profile step, the page is only the data: the builder carries the
 * progress bar and the heading because both change with every question.
 */
export default async function OnboardingOfferPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding/profile");
  if (profile.onboarding_completed_at) redirect("/onboarding/share");

  const supabase = await createSupabaseServerClient();
  const { data: category } = profile.category_id
    ? await supabase
        .from("activity_categories")
        .select("config")
        .eq("id", profile.category_id)
        .maybeSingle()
    : { data: null };

  const config = parseCategoryConfig(category?.config);

  return (
    <FirstOfferForm
      categoryFields={config.suggested_fields}
      suggestedActionType={config.default_action_type}
      currency={profile.currency}
      locale={profile.locale}
      profileWhatsapp={profile.whatsapp_number}
    />
  );
}
