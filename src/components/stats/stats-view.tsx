"use client";

import {
  ArrowRight,
  Eye,
  MousePointerClick,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, type CSSProperties, type ReactNode } from "react";

import { BlockGlyph } from "@/components/page/editor/block-meta";
import { ColumnChart, ShareBar } from "@/components/dashboard/charts";
import { ShareLink } from "@/components/share/share-link";
import { ChoiceChips } from "@/components/ui/choice-cards";
import { isBlockType } from "@/lib/page/blocks";
import { linkLabel } from "@/lib/page/urls";
import { seriesColor } from "@/lib/stats/palette";
import type { SourceKind } from "@/lib/tracking/sources";
import {
  PERIODS,
  insight,
  isEmpty,
  rate,
  variation,
  type PageStats,
  type Period,
} from "@/lib/tracking/stats";
import { cn } from "@/lib/utils";

import { AnimatedNumber, Sparkline } from "./figures";
import { SOURCE_BRANDS, SourceIcon } from "./source-icon";

export type SourceName = { slug: string; label: string; kind: SourceKind };

function Delta({ change }: { change: number | null }) {
  const t = useTranslations("stats");
  if (change === null)
    return <span className="text-ink-subtle text-[12px]">{t("noComparison")}</span>;
  const up = change > 0;
  const flat = change === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums",
        flat
          ? "bg-ink/5 text-ink-muted"
          : up
            ? "bg-success-soft text-success"
            : "bg-danger-soft text-danger",
      )}
    >
      {flat ? null : up ? (
        <TrendingUp className="size-3" aria-hidden />
      ) : (
        <TrendingDown className="size-3" aria-hidden />
      )}
      {t("change", { change: `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}` })}
    </span>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border-line bg-surface rounded-[var(--radius-lg)] border p-5", className)}
    >
      <h2 className="text-ink mb-4 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** A ranked row: icon, name, figure, and a bar the length of its share. */
function RankRow({
  icon,
  label,
  value,
  share,
  detail,
  index,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  share: number;
  detail?: string;
  index: number;
}) {
  return (
    <li
      className="rise-in space-y-1.5"
      style={{ "--rise-delay": `${Math.min(index, 8) * 0.04}s` } as CSSProperties}
    >
      <div className="flex items-center gap-2.5 text-[14px]">
        {icon ? (
          <span className="text-ink-muted flex size-5 shrink-0 items-center justify-center">
            {icon}
          </span>
        ) : null}
        <span className="text-ink min-w-0 flex-1 truncate">{label}</span>
        {detail ? <span className="text-ink-subtle text-[12px] tabular-nums">{detail}</span> : null}
        <span className="text-ink font-semibold tabular-nums">{value}</span>
      </div>
      <div className="bg-ink/[0.05] h-1.5 overflow-hidden rounded-full" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-[var(--color-brand)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(share, 2)}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.04 }}
        />
      </div>
    </li>
  );
}

const flag = (country: string) =>
  /^[A-Z]{2}$/.test(country)
    ? String.fromCodePoint(...[...country].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))
    : "";

export function StatsView({
  stats,
  period,
  sources,
  publicUrl,
  displayName,
}: {
  stats: PageStats;
  period: Period;
  sources: SourceName[];
  publicUrl: string;
  displayName: string;
}) {
  const t = useTranslations("stats");
  const tBlocks = useTranslations("page.blocks");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The new period's figures come from the server; the old ones dim meanwhile.
  const [pending, startTransition] = useTransition();

  const number = new Intl.NumberFormat(locale);
  const format = (value: number) => number.format(value);
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const countryName = (code: string) => {
    try {
      return regionNames.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const sourceName = (slug: string) => {
    const named = sources.find((source) => source.slug === slug);
    if (named) return named.label;
    if (SOURCE_BRANDS[slug]) return SOURCE_BRANDS[slug];
    if (slug === "direct" || slug === "web") return t(`sources.${slug}`);
    return slug;
  };
  const sourceKind = (slug: string) => sources.find((source) => source.slug === slug)?.kind ?? null;

  const blockName = (block: PageStats["blocks"][number]) => {
    const type = isBlockType(block.type) ? block.type : null;
    const title = type ? tBlocks(`${type}.title`) : block.type;
    const config = block.config ?? {};
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    const detail =
      block.offer_title ||
      text(config.title) ||
      text(config.label) ||
      (typeof config.url === "string" ? linkLabel(config.url) : "");
    return detail ? `${title} · ${detail}` : title;
  };

  function changePeriod(next: Period) {
    const params = new URLSearchParams(searchParams);
    params.set("days", String(next));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const header = (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-ink text-[26px] font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t("subtitle")}</p>
      </div>
      <div className={cn("transition-opacity", pending && "opacity-60")}>
        <ChoiceChips
          label={t("period")}
          value={String(period)}
          onChange={(value) => changePeriod(Number(value) as Period)}
          options={PERIODS.map((days) => ({
            value: String(days),
            label: t("days", { count: days }),
          }))}
        />
      </div>
    </header>
  );

  if (isEmpty(stats)) {
    return (
      <div>
        {header}
        <EmptyState publicUrl={publicUrl} displayName={displayName} />
      </div>
    );
  }

  const { totals, previous } = stats;
  const fact = insight(stats);
  const insightText = (() => {
    if (!fact) return null;
    switch (fact.key) {
      case "topSource":
        return t("insight.topSource", { share: fact.share, source: sourceName(fact.source) });
      case "visitsUp":
        return t("insight.visitsUp", { change: fact.change, days: period });
      case "visitsDown":
        return t("insight.visitsDown", { change: fact.change, days: period });
      case "topBlock": {
        const block = stats.blocks.find((item) => item.id === fact.blockId);
        return block
          ? t("insight.topBlock", { block: blockName(block), count: fact.clicks })
          : null;
      }
      case "contactRate":
        return t("insight.contactRate", { rate: fact.rate });
      case "firstVisits":
        return t("insight.firstVisits", { count: fact.views, days: period });
    }
  })();

  const cards = [
    {
      key: "views",
      icon: Eye,
      value: totals.views,
      previous: previous.views,
      series: stats.daily.map((d) => d.views),
      color: seriesColor(0),
    },
    {
      key: "clicks",
      icon: MousePointerClick,
      value: totals.clicks,
      previous: previous.clicks,
      series: stats.daily.map((d) => d.clicks),
      color: seriesColor(1),
    },
    {
      key: "contacts",
      icon: UserRoundCheck,
      value: totals.contacts,
      previous: previous.contacts,
      series: stats.daily.map((d) => d.contacts),
      color: seriesColor(2),
    },
  ] as const;

  const dayLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const point = (key: "views" | "contacts") =>
    stats.daily.map((day) => ({
      key: day.day,
      label: dayLabel.format(new Date(`${day.day}T12:00:00Z`)),
      value: day[key],
    }));

  const { funnel } = stats;
  const clickRate = rate(funnel.clickers, funnel.visitors);
  const contactRate = rate(funnel.contacters, funnel.clickers);
  const maxSource = Math.max(...stats.sources.map((s) => s.views), 1);
  const maxBlock = Math.max(...stats.blocks.map((b) => b.clicks), 1);
  const maxCountry = Math.max(...stats.countries.map((c) => c.views), 1);
  const maxCity = Math.max(...stats.cities.map((c) => c.views), 1);
  const deviceTotal = stats.devices.reduce((sum, d) => sum + d.views, 0);

  return (
    <div className={cn("space-y-5 transition-opacity", pending && "opacity-60")}>
      {header}

      {insightText ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-ink flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] px-4 py-3 text-[14.5px] leading-relaxed"
        >
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]" aria-hidden />
          {insightText}
        </motion.p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card, index) => (
          <section
            key={card.key}
            aria-label={t(`kpi.${card.key}`)}
            className="rise-in border-line bg-surface rounded-[var(--radius-lg)] border p-5"
            style={{ "--rise-delay": `${index * 0.06}s` } as CSSProperties}
          >
            <div className="text-ink-muted flex items-center gap-2 text-[13px] font-medium">
              <card.icon className="size-4" aria-hidden />
              {t(`kpi.${card.key}`)}
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-ink text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                <AnimatedNumber value={card.value} format={format} />
              </p>
              <Sparkline values={card.series} color={card.color} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Delta change={variation(card.value, card.previous)} />
              {variation(card.value, card.previous) === null ? null : (
                <span className="text-ink-subtle text-[12px]">
                  {t("vsPrevious", { days: period })}
                </span>
              )}
            </div>
          </section>
        ))}
      </div>

      <section
        aria-label={t("funnel.label")}
        className="border-line bg-surface rounded-[var(--radius-lg)] border p-5"
      >
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px]">
          <li className="text-ink font-semibold">
            {t("funnel.views", { count: funnel.visitors })}
          </li>
          <li className="text-ink-subtle flex items-center gap-1.5 text-[12.5px]">
            <ArrowRight className="size-3.5" aria-hidden />
            {clickRate === null ? "—" : t("funnel.rate", { rate: clickRate })}
            <ArrowRight className="size-3.5" aria-hidden />
          </li>
          <li className="text-ink font-semibold">
            {t("funnel.clicks", { count: funnel.clickers })}
          </li>
          <li className="text-ink-subtle flex items-center gap-1.5 text-[12.5px]">
            <ArrowRight className="size-3.5" aria-hidden />
            {contactRate === null ? "—" : t("funnel.rate", { rate: contactRate })}
            <ArrowRight className="size-3.5" aria-hidden />
          </li>
          <li className="font-semibold text-[var(--color-brand)]">
            {t("funnel.contacts", { count: funnel.contacters })}
          </li>
        </ol>
        <p className="text-ink-muted mt-2 text-[12.5px]">{t("funnel.hint")}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("charts.views")}>
          <ColumnChart
            points={point("views")}
            format={format}
            title={t("charts.views")}
            color={seriesColor(0)}
            emptyLabel={t("charts.empty")}
          />
        </Panel>
        <Panel title={t("charts.contacts")}>
          <ColumnChart
            points={point("contacts")}
            format={format}
            title={t("charts.contacts")}
            color={seriesColor(2)}
            emptyLabel={t("charts.empty")}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("blocks.title")}>
          {stats.blocks.length === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("blocks.empty")}</p>
          ) : (
            <ol className="space-y-3.5">
              {stats.blocks.map((block, index) => (
                <RankRow
                  key={block.id}
                  index={index}
                  icon={isBlockType(block.type) ? <BlockGlyph type={block.type} size="sm" /> : null}
                  label={blockName(block)}
                  value={format(block.clicks)}
                  detail={
                    block.contacts ? t("blocks.contacts", { count: block.contacts }) : undefined
                  }
                  share={(block.clicks / maxBlock) * 100}
                />
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t("sources.title")}>
          <ol className="space-y-3.5">
            {stats.sources.map((source, index) => (
              <RankRow
                key={source.source}
                index={index}
                icon={
                  <SourceIcon
                    source={source.source}
                    kind={sourceKind(source.source)}
                    className="size-4"
                  />
                }
                label={sourceName(source.source)}
                value={format(source.views)}
                detail={
                  source.contacts ? t("blocks.contacts", { count: source.contacts }) : undefined
                }
                share={(source.views / maxSource) * 100}
              />
            ))}
          </ol>
          <Link
            href="/dashboard/stats/links"
            className="text-ink mt-4 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
          >
            {t("sources.manage")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("places.countries")}>
          {stats.countries.length === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("places.unknown")}</p>
          ) : (
            <ol className="space-y-3.5">
              {stats.countries.map((country, index) => (
                <RankRow
                  key={country.country}
                  index={index}
                  icon={<span aria-hidden>{flag(country.country)}</span>}
                  label={countryName(country.country)}
                  value={format(country.views)}
                  share={(country.views / maxCountry) * 100}
                />
              ))}
            </ol>
          )}
        </Panel>
        <Panel title={t("places.cities")}>
          {stats.cities.length === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("places.unknown")}</p>
          ) : (
            <ol className="space-y-3.5">
              {stats.cities.map((city, index) => (
                <RankRow
                  key={`${city.city}-${city.country}`}
                  index={index}
                  label={city.city}
                  detail={city.country ? flag(city.country) : undefined}
                  value={format(city.views)}
                  share={(city.views / maxCity) * 100}
                />
              ))}
            </ol>
          )}
        </Panel>
        <Panel title={t("devices.title")}>
          {deviceTotal === 0 ? (
            <p className="text-ink-subtle text-[13px]">{t("places.unknown")}</p>
          ) : (
            <ShareBar
              slices={stats.devices.map((device, index) => ({
                id: device.device,
                label: t(`devices.${device.device}`),
                value: device.views,
                share: device.views / deviceTotal,
                color: seriesColor(index),
              }))}
              countLabel={(value) => t("visits", { count: value })}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

/** No visit yet: what the page is for, and the first thing to do. */
function EmptyState({ publicUrl, displayName }: { publicUrl: string; displayName: string }) {
  const t = useTranslations("stats.empty");
  return (
    <section className="border-line bg-surface rise-in rounded-[var(--radius-lg)] border p-6 text-center sm:p-10">
      <span
        aria-hidden
        className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
      >
        <Eye className="size-6" />
      </span>
      <h2 className="text-ink mt-5 text-[20px] font-semibold tracking-[-0.02em]">{t("title")}</h2>
      <p className="text-ink-muted mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed">
        {t("body")}
      </p>
      <div className="mx-auto mt-6 max-w-md text-left">
        <ShareLink url={publicUrl} displayName={displayName} />
      </div>
      <ol className="text-ink-muted mx-auto mt-6 max-w-md space-y-2 text-left text-[13.5px]">
        {(["bio", "links", "qr"] as const).map((step, index) => (
          <li key={step} className="flex gap-2.5">
            <span className="text-ink flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[11.5px] font-semibold">
              {index + 1}
            </span>
            {t(`steps.${step}`)}
          </li>
        ))}
      </ol>
      <Link
        href="/dashboard/stats/links"
        className="bg-ink text-ink-inverse mt-6 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium"
      >
        {t("cta")}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
