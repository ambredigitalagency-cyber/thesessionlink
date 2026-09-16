import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { OnboardingSteps } from "@/components/onboarding/steps";
import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingProfilePage() {
  await requireUser();
  if (await getCurrentProfile()) redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("activity_categories")
    .select("id, slug, name, icon, config")
    .eq("is_active", true)
    .order("position");

  const t = await getTranslations("onboarding.profile");

  return (
    <>
      <OnboardingSteps current={2} />
      <h1 className="text-ink text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">
        {t("title")}
      </h1>
      <p className="text-ink-muted mt-2.5 max-w-lg text-[16px] leading-relaxed">{t("subtitle")}</p>

      <div className="mt-9">
        <ProfileSetupForm
          categories={categories ?? []}
          linkBase={siteUrl.replace(/^https?:\/\//, "")}
        />
      </div>
    </>
  );
}
