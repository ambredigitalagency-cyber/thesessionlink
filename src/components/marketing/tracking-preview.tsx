"use client";

import { ArrowRight, Eye, MousePointerClick, QrCode, UserRoundCheck } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { ColumnChart } from "@/components/dashboard/charts";
import { AnimatedNumber, Sparkline } from "@/components/stats/figures";
import { SourceIcon } from "@/components/stats/source-icon";

import { SectionPill } from "./all-in-one";
import { EASE, SectionHeading } from "./section";

/**
 * What the statistics look like, drawn with the Statistics page's own pieces
 * (animated figures, sparklines, the daily chart) over made-up numbers — and
 * labelled "Example data" right on the card. Then where clients come from:
 * Instagram, WhatsApp, a printed QR code, into the page, out as a contact.
 */

// Example data. Not anyone's statistics, and never presented as such.
const DAILY = [12, 18, 15, 22, 19, 27, 24, 31, 26, 34, 29, 38, 33, 41];
const KPIS = [
  { key: "visits", value: 369, icon: Eye, series: DAILY },
  {
    key: "clicks",
    value: 142,
    icon: MousePointerClick,
    series: DAILY.map((v) => Math.round(v * 0.4)),
  },
  {
    key: "contacts",
    value: 37,
    icon: UserRoundCheck,
    series: DAILY.map((v) => Math.round(v * 0.1)),
  },
] as const;
const SOURCES = [
  { slug: "instagram", kind: "instagram", share: 46 },
  { slug: "whatsapp", kind: "whatsapp", share: 24 },
  { slug: "qr-flyer", kind: "flyer", share: 18 },
  { slug: "direct", kind: "autre", share: 12 },
] as const;
const COUNTRIES = [
  { code: "MA", share: 58 },
  { code: "FR", share: 27 },
  { code: "BE", share: 9 },
] as const;

export function TrackingPreview() {
  const t = useTranslations("landing.tracking");
  const locale = useLocale();
  const number = useCallback(
    (value: number) => new Intl.NumberFormat(locale).format(value),
    [locale],
  );
  const regions = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const points = DAILY.map((value, index) => ({
    key: String(index),
    label: t("day", { number: index + 1 }),
    value,
  }));

  return (
    <section id="tracking" className="bg-night text-on-night scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionPill tone="night">{t("pill")}</SectionPill>
        <SectionHeading tone="night" title={t("title")} subtitle={t("subtitle")} className="mt-4" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="bg-canvas text-ink relative mt-12 rounded-[2rem] p-4 sm:p-6"
        >
          <span className="bg-ink text-ink-inverse absolute -top-3 left-6 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
            {t("sample")}
          </span>

          <div className="grid gap-3 sm:grid-cols-3">
            {KPIS.map(({ key, value, icon: Icon, series }) => (
              <div key={key} className="surface-card p-4">
                <p className="text-ink-muted flex items-center gap-1.5 text-[13px]">
                  <Icon className="size-3.5" aria-hidden />
                  {t(`kpi.${key}`)}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-ink text-[30px] font-semibold tracking-[-0.03em] tabular-nums">
                    <AnimatedNumber value={value} format={number} />
                  </p>
                  <Sparkline values={[...series]} color="var(--color-brand)" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="surface-card p-4">
              <p className="text-ink text-[14px] font-semibold">{t("chartTitle")}</p>
              <div className="mt-3">
                <ColumnChart
                  points={points}
                  format={number}
                  title={t("chartTitle")}
                  emptyLabel=""
                />
              </div>
            </div>
            <div className="grid gap-3">
              <div className="surface-card p-4">
                <p className="text-ink text-[14px] font-semibold">{t("sourcesTitle")}</p>
                <ul className="mt-3 space-y-2.5">
                  {SOURCES.map((source) => (
                    <li key={source.slug} className="text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink flex items-center gap-2">
                          <SourceIcon
                            source={source.slug}
                            kind={source.kind}
                            className="size-3.5"
                          />
                          {t(`sources.${source.kind}`)}
                        </span>
                        <span className="text-ink-muted tabular-nums">{source.share} %</span>
                      </div>
                      <div className="bg-ink/[0.06] mt-1.5 h-1.5 overflow-hidden rounded-full">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${source.share}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: EASE }}
                          className="h-full rounded-full bg-[var(--color-brand)]"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface-card p-4">
                <p className="text-ink text-[14px] font-semibold">{t("countriesTitle")}</p>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {COUNTRIES.map((country) => (
                    <li key={country.code} className="flex justify-between">
                      <span className="text-ink">{regions?.of(country.code) ?? country.code}</span>
                      <span className="text-ink-muted tabular-nums">{country.share} %</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        <Flow />
      </div>
    </section>
  );
}

/** Instagram, WhatsApp, a QR code → your page → a contact. */
function Flow() {
  const t = useTranslations("landing.tracking.flow");

  const origins = [
    {
      key: "instagram",
      icon: <SourceIcon source="instagram" kind="instagram" className="size-4" />,
      value: 128,
    },
    {
      key: "whatsapp",
      icon: <SourceIcon source="whatsapp" kind="whatsapp" className="size-4" />,
      value: 64,
    },
    { key: "qr", icon: <QrCode className="size-4" aria-hidden />, value: 41 },
  ] as const;

  return (
    <div className="mt-14">
      <h3 className="text-on-night text-[20px] font-semibold tracking-[-0.02em]">{t("title")}</h3>
      <div className="mt-6 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)_auto_minmax(0,0.8fr)]">
        <ul className="space-y-2.5">
          {origins.map((origin, index) => (
            <motion.li
              key={origin.key}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: EASE }}
              className="flex items-center justify-between gap-3 rounded-[1rem] bg-white/[0.06] px-4 py-3"
            >
              <span className="flex items-center gap-2.5 text-[14px] text-white/90">
                {origin.icon}
                {t(`origins.${origin.key}`)}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-white/70">
                {t("bubble", { count: origin.value })}
              </span>
            </motion.li>
          ))}
        </ul>
        <Arrow />
        <Node title={t("page")} note={t("pageNote")} />
        <Arrow />
        <Node title={t("contact")} note={t("contactNote")} accent />
      </div>
      <p className="mt-4 text-[12px] text-white/45">{t("legend")}</p>
    </div>
  );
}

function Node({ title, note, accent = false }: { title: string; note: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.25, ease: EASE }}
      className={`rounded-[1.25rem] px-5 py-4 text-center ${accent ? "bg-[var(--accent)] text-white" : "bg-white text-[#0c0c0d]"}`}
    >
      <p className="text-[15px] font-semibold">{title}</p>
      <p className={`mt-0.5 text-[12.5px] ${accent ? "text-white/85" : "text-black/60"}`}>{note}</p>
    </motion.div>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="flex justify-center text-white/40 max-md:rotate-90">
      <ArrowRight className="size-5" />
    </span>
  );
}
