"use client";

import { ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { EmptyState } from "@/components/ui/primitives";
import { seriesColor, OTHER_COLOR } from "@/lib/stats/palette";
import { STATS_RANGES, type Stats, type StatsRange } from "@/lib/stats/compute";
import { cn, formatPrice } from "@/lib/utils";

import { ColumnChart, Meter, ShareBar, StatTile, type Point } from "./charts";

export function StatsView({
  stats,
  range,
  currency,
  locale,
  timezone,
  hasBookings,
}: {
  stats: Stats;
  range: StatsRange;
  currency: string;
  locale: string;
  timezone: string;
  /** False only for a pro who has never received anything, ever. */
  hasBookings: boolean;
}) {
  const t = useTranslations("dashboard.stats");
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const money = (value: number) =>
    formatPrice(value, currency, tag, "fixed").amount ?? String(value);
  const hours = (minutes: number) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(minutes / 60);

  const points: Point[] = useMemo(() => {
    const format = new Intl.DateTimeFormat(tag, {
      day: stats.granularity === "month" ? undefined : "numeric",
      month: "short",
      year: stats.granularity === "month" ? "numeric" : undefined,
      timeZone: timezone,
    });

    return stats.buckets.map((bucket) => ({
      key: bucket.key,
      label: format.format(bucket.start),
      value: bucket.bookings,
    }));
  }, [stats.buckets, stats.granularity, tag, timezone]);

  const revenuePoints: Point[] = useMemo(
    () => points.map((point, index) => ({ ...point, value: stats.buckets[index]?.revenue ?? 0 })),
    [points, stats.buckets],
  );

  const slices = stats.offers.map((offer, index) => ({
    id: offer.id,
    label: offer.id === "other" ? t("otherOffers") : offer.label,
    value: offer.bookings,
    share: offer.share,
    color: offer.id === "other" ? OTHER_COLOR : seriesColor(index),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
          <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
        </div>

        <nav aria-label={t("rangeLabel")} className="flex gap-1">
          {STATS_RANGES.map((option) => (
            <Link
              key={option}
              href={`/dashboard/stats?range=${option}`}
              scroll={false}
              aria-current={option === range ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                option === range
                  ? "bg-ink text-ink-inverse"
                  : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink border",
              )}
            >
              {t(`range.${option}`)}
            </Link>
          ))}
        </nav>
      </div>

      {!hasBookings ? (
        <EmptyState
          icon={<ChartNoAxesColumn className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("kpi.bookings")}
              value={String(stats.totals.bookings)}
              hint={t("kpi.bookingsHint", { confirmed: stats.totals.confirmed })}
            />
            <StatTile
              label={t("kpi.revenue")}
              value={money(stats.totals.revenue)}
              hint={t("kpi.revenueHint")}
            />
            <StatTile
              label={t("kpi.fill")}
              value={
                stats.totals.fillRate === null ? "—" : `${Math.round(stats.totals.fillRate * 100)}%`
              }
              hint={
                stats.totals.fillRate === null
                  ? t("kpi.fillNoHours")
                  : t("kpi.fillHint", {
                      booked: hours(stats.totals.bookedMinutes),
                      open: hours(stats.totals.openMinutes),
                    })
              }
            />
            <StatTile
              label={t("kpi.missed")}
              value={`${Math.round(stats.totals.missedRate * 100)}%`}
              hint={t("kpi.missedHint", {
                cancelled: stats.totals.cancelled,
                noShow: stats.totals.noShow,
              })}
            />
          </div>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="text-ink text-[15px] font-semibold">{t("trend.title")}</h2>
            <p className="text-ink-muted mt-0.5 mb-5 text-[13px]">{t("trend.hint")}</p>
            <ColumnChart
              points={points}
              format={(value) => String(value)}
              title={t("trend.title")}
              emptyLabel={t("noData")}
            />
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="text-ink text-[15px] font-semibold">{t("revenue.title")}</h2>
            <p className="text-ink-muted mt-0.5 mb-5 text-[13px]">{t("revenue.hint")}</p>
            <ColumnChart
              points={revenuePoints}
              format={money}
              title={t("revenue.title")}
              emptyLabel={t("revenue.empty")}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-card p-5 sm:p-6">
              <h2 className="text-ink mb-5 text-[15px] font-semibold">{t("fill.title")}</h2>
              {stats.totals.fillRate === null ? (
                <p className="text-ink-subtle text-[13px]">{t("fill.noHours")}</p>
              ) : (
                <Meter
                  value={stats.totals.fillRate}
                  label={t("fill.label")}
                  caption={t("fill.caption", {
                    booked: hours(stats.totals.bookedMinutes),
                    open: hours(stats.totals.openMinutes),
                  })}
                />
              )}
            </section>

            <section className="surface-card p-5 sm:p-6">
              <h2 className="text-ink mb-5 text-[15px] font-semibold">{t("missed.title")}</h2>
              <Meter
                value={stats.totals.missedRate}
                label={t("missed.label")}
                tone="warning"
                caption={t("missed.caption", {
                  missed: stats.totals.missed,
                  total: stats.totals.bookings,
                })}
              />
              <MissedTable stats={stats} />
            </section>
          </div>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="text-ink text-[15px] font-semibold">{t("offers.title")}</h2>
            <p className="text-ink-muted mt-0.5 mb-5 text-[13px]">{t("offers.hint")}</p>
            {slices.length === 0 ? (
              <p className="text-ink-subtle text-[13px]">{t("noData")}</p>
            ) : (
              <ShareBar
                slices={slices}
                countLabel={(value) => t("offers.count", { count: value })}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * The two causes, side by side. A single merged percentage would hide which of
 * the two the pro can actually act on — and it doubles as the accessible table
 * for the meter above it.
 */
function MissedTable({ stats }: { stats: Stats }) {
  const t = useTranslations("dashboard.stats");
  const { bookings, cancelled, noShow, missed } = stats.totals;
  const share = (value: number) => (bookings > 0 ? Math.round((value / bookings) * 100) : 0);

  const rows = [
    { key: "cancelled", label: t("missed.cancelled"), value: cancelled },
    { key: "noShow", label: t("missed.noShow"), value: noShow },
    { key: "total", label: t("missed.total"), value: missed },
  ];

  return (
    <table className="mt-5 w-full text-[13px]">
      <caption className="sr-only">{t("missed.tableCaption")}</caption>
      <thead>
        <tr className="text-ink-subtle border-line border-b text-left">
          <th scope="col" className="pb-1.5 font-normal">
            {t("missed.cause")}
          </th>
          <th scope="col" className="pb-1.5 text-right font-normal">
            {t("missed.count")}
          </th>
          <th scope="col" className="pb-1.5 text-right font-normal">
            {t("missed.share")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={cn(row.key === "total" && "border-line border-t")}>
            <th
              scope="row"
              className={cn(
                "py-1.5 text-left font-normal",
                row.key === "total" ? "text-ink font-medium" : "text-ink-muted",
              )}
            >
              {row.label}
            </th>
            <td className="text-ink py-1.5 text-right tabular-nums">{row.value}</td>
            <td className="text-ink-muted py-1.5 text-right tabular-nums">{share(row.value)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
