"use client";

import { useTranslations } from "next-intl";

import { ConsoleKpi, ConsolePanel } from "@/components/admin/console-kpi";
import { ColumnChart, ShareBar } from "@/components/dashboard/charts";
import { ACCOUNT_STATUSES, type PlatformTotals } from "@/lib/admin/status";
import { OTHER_COLOR, seriesColor } from "@/lib/stats/palette";

/**
 * The state of the platform, in four numbers and two pictures.
 *
 * What changed is the ranking, not the data. Before, eight figures had the
 * same weight: four small tiles, a chart, a bar, and a line of per-status
 * counts at the bottom that nobody reads. Now the four that matter are set
 * large with their context attached, the two charts get the room a chart
 * needs, and the per-status breakdown has moved inside the figures it belongs
 * to instead of trailing the page as a sentence.
 *
 * The chart pieces themselves are the coach's — same ColumnChart, same
 * ShareBar, same validated series palette. The console does not invent a
 * second way of drawing a number; it decides which numbers come first.
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

  const inactive = totals.byStatus.expired + totals.byStatus.suspended + totals.byStatus.deleted;

  // The last twelve buckets, for the "signed up this month" line.
  const thisMonth = signups.at(-1)?.count ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ConsoleKpi
          index={0}
          label={t("stats.coaches")}
          value={String(totals.coaches)}
          parts={[{ value: `+${thisMonth}`, label: t("stats.thisMonth") }]}
        />
        <ConsoleKpi
          index={1}
          label={t("stats.subscribed")}
          value={String(totals.byStatus.subscribed)}
          tone="accent"
          parts={[
            { value: String(totals.byStatus.trial), label: t("status.trial") },
            { value: String(totals.byStatus.expired), label: t("status.expired") },
          ]}
        />
        <ConsoleKpi
          index={2}
          label={t("stats.revenue")}
          value={`${totals.monthlyRevenue} €`}
          footnote={t("stats.revenueHint", { price: monthlyPrice })}
        />
        <ConsoleKpi
          index={3}
          label={t("stats.inactive")}
          value={String(inactive)}
          tone={inactive > 0 ? "neutral" : "quiet"}
          parts={[
            { value: String(totals.byStatus.suspended), label: t("status.suspended") },
            { value: String(totals.byStatus.deleted), label: t("status.deleted") },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ConsolePanel index={4} title={t("stats.signups")} hint={t("stats.signupsHint")}>
          <ColumnChart
            points={points}
            format={(value) => String(value)}
            title={t("stats.signups")}
            color="var(--console-accent)"
            emptyLabel={t("stats.noData")}
          />
        </ConsolePanel>

        <ConsolePanel index={5} title={t("stats.categories")} hint={t("stats.categoriesHint")}>
          {slices.length === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("stats.noData")}</p>
          ) : (
            <ShareBar slices={slices} countLabel={(value) => String(value)} />
          )}
        </ConsolePanel>
      </div>

      {/* Kept reachable for a screen reader, since the figures above now carry
          the same counts visually. */}
      <p className="sr-only">
        {t("stats.statuses", {
          list: ACCOUNT_STATUSES.map(
            (status) => `${t(`status.${status}`)} ${totals.byStatus[status]}`,
          ).join(" · "),
        })}
      </p>
    </div>
  );
}
