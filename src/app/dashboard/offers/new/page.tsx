import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DashboardOfferForm } from "@/components/dashboard/offer-editor";
import { requireOnboardedProfile } from "@/lib/auth";
import { planLimits } from "@/lib/plans/config";
import { parseCategoryConfig } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewOfferPage() {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.offers");

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
    <>
      <Link
        href="/dashboard/offers"
        className="text-ink-muted hover:text-ink mb-5 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t("title")}
      </Link>

      <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("newTitle")}</h1>
      <p className="text-ink-muted mt-1 text-[15px]">{t("newSubtitle")}</p>

      <div className="surface-card mt-7 p-5 sm:p-7">
        <DashboardOfferForm
          mode="create"
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
