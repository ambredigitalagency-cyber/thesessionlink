import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { OffersList, type OfferListItem } from "@/components/dashboard/offers-list";
import { Button } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.nav");
  return { title: t("offers") };
}

export default async function DashboardOffersPage() {
  const profile = await requireOnboardedProfile();
  const t = await getTranslations("dashboard.offers");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("offers")
    .select(
      "id, title, price, price_type, main_photo_url, action_type, action_config, is_active, position",
    )
    .eq("profile_id", profile.id)
    .order("position");

  const offers = (data ?? []) as OfferListItem[];

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
          <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/offers/new">
            <Plus className="size-4" />
            {t("new")}
          </Link>
        </Button>
      </header>

      <OffersList offers={offers} currency={profile.currency} locale={profile.locale} />
    </>
  );
}
