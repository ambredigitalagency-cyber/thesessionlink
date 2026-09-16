import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { FirstOfferForm } from "@/components/onboarding/first-offer-form";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { planLimits } from "@/lib/plans/config";
import { parseCategoryConfig } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const t = await getTranslations("onboarding.offer");

  return (
    <>
      <OnboardingSteps current={3} />
      <h1 className="text-ink text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">
        {t("title")}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-lg text-[16px] leading-relaxed">{t("subtitle")}</p>

      <div className="surface-card mt-9 p-5 sm:p-7">
        <FirstOfferForm
          categoryFields={config.suggested_fields}
          suggestedActionType={config.default_action_type}
          currency={profile.currency}
          locale={profile.locale}
          profileWhatsapp={profile.whatsapp_number}
          maxPhotos={planLimits(profile).maxPhotosPerOffer}
        />
      </div>
    </>
  );
}
