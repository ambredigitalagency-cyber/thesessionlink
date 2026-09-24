"use client";

import { useTranslations } from "next-intl";

import { ColumnChart, ShareBar, StatTile } from "@/components/dashboard/charts";
import { ACCOUNT_STATUSES, type PlatformTotals } from "@/lib/admin/status";
import { OTHER_COLOR, seriesColor } from "@/lib/stats/palette";

/**
 * Platform figures. Same chart pieces as the coach's statistics page — the
 * console looks different, it does not invent a second visual language.
 */
export function PlatformSummary({
  totals,
  signups,
  monthlyPrice,
}: {
  totals: PlatformTotals;
  signups: { key: string; count: number }[];
  monthlyPrice: number;
}) {
  const t = useTranslations("admin");

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
  const points = signups.map((bucket) => ({
    key: bucket.key,
    label: monthLabel.format(new Date(`${bucket.key}-01T12:00:00Z`)),
    value: bucket.count,
  }));

  const slices = totals.categories.slice(0, 5).map((category, index) => ({
    id: category.label,
    label: category.label,
    value: category.count,
    share: totals.coaches > 0 ? category.count / totals.coaches : 0,
    color: seriesColor(index),
  }));

  const tail = totals.categories.slice(5);
  if (tail.length > 0) {
    const count = tail.reduce((sum, category) => sum + category.count, 0);
    slices.push({
      id: "other",
      label: t("stats.otherCategories"),
      value: count,
      share: totals.coaches > 0 ? count / totals.coaches : 0,
      color: OTHER_COLOR,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("stats.coaches")} value={String(totals.coaches)} />
        <StatTile
          label={t("stats.subscribed")}
          value={String(totals.byStatus.subscribed)}
          hint={t("stats.trialCount", { count: totals.byStatus.trial })}
        />
        <StatTile
          label={t("stats.revenue")}
          value={`${totals.monthlyRevenue} €`}
          hint={t("stats.revenueHint", { price: monthlyPrice })}
        />
        <StatTile
          label={t("stats.inactive")}
          value={String(
            totals.byStatus.expired + totals.byStatus.suspended + totals.byStatus.deleted,
          )}
          hint={t("stats.inactiveHint", {
            suspended: totals.byStatus.suspended,
            deleted: totals.byStatus.deleted,
          })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5 sm:p-6">
          <h2 className="text-ink text-[15px] font-semibold">{t("stats.signups")}</h2>
          <p className="text-ink-muted mt-0.5 mb-5 text-[13px]">{t("stats.signupsHint")}</p>
          <ColumnChart
            points={points}
            format={(value) => String(value)}
            title={t("stats.signups")}
            color="var(--color-ink)"
            emptyLabel={t("stats.noData")}
          />
        </section>

        <section className="surface-card p-5 sm:p-6">
          <h2 className="text-ink text-[15px] font-semibold">{t("stats.categories")}</h2>
          <p className="text-ink-muted mt-0.5 mb-5 text-[13px]">{t("stats.categoriesHint")}</p>
          {slices.length === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("stats.noData")}</p>
          ) : (
            <ShareBar slices={slices} countLabel={(value) => String(value)} />
          )}
        </section>
      </div>

      <p className="text-ink-subtle text-[12.5px]">
        {t("stats.statuses", {
          list: ACCOUNT_STATUSES.map(
            (status) => `${t(`status.${status}`)} ${totals.byStatus[status]}`,
          ).join(" · "),
        })}
      </p>
    </div>
  );
}
