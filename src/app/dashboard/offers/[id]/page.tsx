import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardOfferForm } from "@/components/dashboard/offer-editor";
import { OfferAvailability } from "@/components/dashboard/offer-availability";
import { requireOnboardedProfile } from "@/lib/auth";
import { parseCategoryConfig, parseOfferFields } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EditOfferPage({ params }: PageProps<"/dashboard/offers/[id]">) {
  const { id } = await params;
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.offers");

  const supabase = await createSupabaseServerClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!offer) notFound();

  const [{ data: category }, { data: rules }] = await Promise.all([
    profile.category_id
      ? supabase
          .from("activity_categories")
          .select("config")
          .eq("id", profile.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("availabilities")
      .select("id, offer_id, weekday, start_time, end_time")
      .eq("profile_id", profile.id),
  ]);

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

      <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{offer.title}</h1>
      <p className="text-ink-muted mt-1 text-[15px]">{t("editSubtitle")}</p>

      <div className="surface-card mt-7 p-5 sm:p-7">
        <DashboardOfferForm
          mode="edit"
          categoryFields={config.suggested_fields}
          currency={profile.currency}
          locale={profile.locale}
          profileWhatsapp={profile.whatsapp_number}
          initial={{
            id: offer.id,
            title: offer.title,
            description: offer.description,
            price: offer.price,
            price_type: offer.price_type as "fixed" | "from" | "free" | "on_request",
            main_photo_url: offer.main_photo_url,
            action_type: offer.action_type,
            action_config: offer.action_config,
            custom_fields: parseOfferFields(offer.custom_fields),
            is_active: offer.is_active,
          }}
        />
      </div>

      {offer.action_type === "calendar_booking" ? (
        <OfferAvailability
          offerId={offer.id}
          offerTitle={offer.title}
          locale={profile.locale}
          rules={(rules ?? []).map((rule) => ({
            offer_id: rule.offer_id,
            weekday: rule.weekday,
            start_time: rule.start_time,
            end_time: rule.end_time,
          }))}
        />
      ) : null}
    </>
  );
}
