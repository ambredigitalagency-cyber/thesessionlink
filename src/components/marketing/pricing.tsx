"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScaleSlider } from "@/components/ui/slider";
import { PLAN_FEATURES, PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

import { CountUp, useSpotlight } from "./interactive";
import { EASE, SectionHeading } from "./section";

/** Bookings a month, for the cost-per-booking calculator. */
const VOLUME_STOPS = [2, 4, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

/**
 * One plan, so it does not need a column of its own.
 *
 * A single narrow card in the middle of the page is the shape of a pricing
 * table with the other two plans deleted — it leaves the reader looking for
 * what is missing. Laid out wide, with the price on one side and everything
 * included on the other, it reads as what it is: there is one price, and this
 * is all of it.
 */
export function Pricing() {
  const t = useTranslations("landing.pricing");
  const locale = useLocale();
  const spotlight = useSpotlight();
  const [volume, setVolume] = useState(20);

  const money = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          onPointerMove={spotlight}
          className="spotlight surface-card border-ink-strong ring-ink/10 mx-auto mt-12 grid max-w-4xl overflow-hidden ring-2 lg:grid-cols-[0.9fr_1fr]"
        >
          {/* The price side. */}
          <div className="flex flex-col p-7 sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <p className="text-ink-subtle text-[13px] font-medium tracking-[0.1em] uppercase">
                {t("planName")}
              </p>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-ink)]">
                {t("trialBadge")}
              </span>
            </div>

            <div className="mt-5 flex items-end gap-1.5">
              <CountUp
                value={PLAN_PRICE_MONTHLY}
                format={(price) => t("price", { price })}
                className="text-ink text-[56px] leading-none font-semibold tracking-[-0.045em] tabular-nums"
              />
              <span className="text-ink-muted pb-2 text-[14px]">{t("perMonth")}</span>
            </div>

            <p className="text-ink-muted mt-3 text-[13.5px] leading-relaxed">{t("monthlyNote")}</p>

            {/* The flat price, turned into the only figure a coach compares
                it with: what one booking costs them. */}
            <div className="bg-ink/[0.03] mt-6 rounded-[var(--radius-md)] p-4">
              <p className="text-ink-muted text-[13px]">{t("calcLabel")}</p>
              <ScaleSlider
                className="mt-2"
                label={t("calcLabel")}
                stops={VOLUME_STOPS}
                value={volume}
                onChange={setVolume}
                format={(count) => t("calcValue", { count })}
              />
              <p className="text-ink mt-3 text-[14px]" aria-live="polite">
                {t.rich("calcResult", {
                  cost: money(PLAN_PRICE_MONTHLY / volume, 2),
                  strong: (chunks) => (
                    <strong className="font-semibold text-[var(--accent-ink)]">{chunks}</strong>
                  ),
                })}
              </p>
            </div>

            <div className="mt-auto pt-7">
              <Button asChild size="lg" block>
                <Link href="/login?intent=signup">
                  {t("cta")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-ink-subtle mt-3 text-center text-[12.5px]">{t("trialNote")}</p>
            </div>
          </div>

          {/* What is in it. Its own surface, so the two halves read as two
              answers rather than one long card. */}
          <div className="bg-ink/[0.02] border-line border-t p-7 sm:p-9 lg:border-t-0 lg:border-l">
            <p className="text-ink text-[14px] font-medium">{t("featuresIntro")}</p>

            <ul className="mt-5 space-y-3.5">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                    <Check className="size-3" />
                  </span>
                  <span className="text-ink-muted text-[14.5px] leading-snug">
                    {t(`feature.${feature}`)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="border-line text-ink-subtle mt-7 border-t pt-5 text-[12.5px] leading-relaxed">
              {t("paymentsNote")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
