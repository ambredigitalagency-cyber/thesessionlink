import { getTranslations } from "next-intl/server";

import { AdminCoaches, type CoachRow } from "@/components/admin/coaches-table";
import { PlatformSummary } from "@/components/admin/platform-summary";
import { isPlatformAdmin, requireAdmin } from "@/lib/admin/access";
import { platformTotals, signupsByMonth } from "@/lib/admin/status";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  // Metadata is built before the layout guard runs, so a non-admin would read
  // the console's title on their 404 page. Say nothing until they are one.
  if (!(await isPlatformAdmin())) return { title: "Not found" };

  const t = await getTranslations("admin");
  return { title: t("title") };
}

export default async function AdminHomePage() {
  await requireAdmin();
  const t = await getTranslations("admin");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_coach_overview")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  const coaches: CoachRow[] = (data ?? []).map((row) => ({
    id: row.id ?? "",
    display_name: row.display_name ?? "",
    slug: row.slug ?? "",
    contact_email: row.contact_email,
    created_at: row.created_at ?? new Date().toISOString(),
    trial_ends_at: row.trial_ends_at,
    subscription_active: row.subscription_active,
    suspended_at: row.suspended_at,
    deleted_at: row.deleted_at,
    offers_count: row.offers_count ?? 0,
    bookings_count: row.bookings_count ?? 0,
    category_name: row.category_name,
  }));

  const totals = platformTotals(coaches, {
    monthlyPrice: PLAN_PRICE_MONTHLY,
    locale: "fr",
    unknownLabel: t("stats.noCategory"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">
          {t("stats.title")}
        </h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("stats.subtitle")}</p>
      </div>

      <PlatformSummary
        totals={totals}
        signups={signupsByMonth(coaches)}
        monthlyPrice={PLAN_PRICE_MONTHLY}
      />

      <AdminCoaches coaches={coaches} />
    </div>
  );
}
