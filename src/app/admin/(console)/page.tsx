import { getLocale, getTranslations } from "next-intl/server";

import { AdminCoaches, type CoachRow } from "@/components/admin/coaches-table";
import { ConsoleHeader } from "@/components/admin/console-header";
import { PlatformSummary } from "@/components/admin/platform-summary";
import { UnfinishedSignups } from "@/components/admin/unfinished-signups";
import { adminDb, currentAdmin, requireAdmin } from "@/lib/admin/access";
import { platformTotals, signupsByMonth } from "@/lib/admin/status";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

export async function generateMetadata() {
  // Metadata is built before the layout guard runs, so a non-admin would read
  // the console's title on their 404 page. Say nothing until they are one.
  if (!(await currentAdmin())) return { title: "Not found" };

  const t = await getTranslations("admin");
  return { title: t("title") };
}

export default async function AdminHomePage() {
  const actor = await requireAdmin();
  const t = await getTranslations("admin");

  const supabase = await adminDb(actor);
  const [{ data }, { data: unfinished, error: unfinishedError }] = await Promise.all([
    supabase
      .from("admin_coach_overview")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
    // Signed up, no profile yet: invisible in the view above, which lists profiles.
    supabase.rpc("admin_unfinished_signups"),
  ]);
  if (unfinishedError) console.error("[admin] unfinished sign-ups", unfinishedError);

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
    locale: await getLocale(),
    unknownLabel: t("stats.noCategory"),
  });

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow={t("nav.coaches")}
        title={t("stats.title")}
        subtitle={t("stats.subtitle")}
      />

      <PlatformSummary
        totals={totals}
        signups={signupsByMonth(coaches)}
        monthlyPrice={PLAN_PRICE_MONTHLY}
      />

      <AdminCoaches coaches={coaches} />

      <UnfinishedSignups signups={unfinished ?? []} index={9} />
    </div>
  );
}
