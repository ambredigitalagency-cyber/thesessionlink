"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PLAN_FEATURES, PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

import { SectionHeading } from "./how-it-works";

export function Pricing() {
  const t = useTranslations("landing.pricing");

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
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-12 max-w-md"
        >
          <div className="surface-card border-ink-strong ring-ink/10 flex flex-col p-7 ring-2 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-ink-subtle text-[13px] font-medium tracking-[0.1em] uppercase">
                {t("planName")}
              </p>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-ink)]">
                {t("trialBadge")}
              </span>
            </div>

            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-ink text-[48px] leading-none font-semibold tracking-[-0.04em]">
                {t("price", { price: PLAN_PRICE_MONTHLY })}
              </span>
              <span className="text-ink-muted pb-1.5 text-[14px]">{t("perMonth")}</span>
            </div>

            <p className="text-ink-muted mt-2 text-[13.5px] leading-relaxed">{t("monthlyNote")}</p>

            <Button asChild size="md" block className="mt-6">
              <Link href="/login?intent=signup">
                {t("cta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <p className="text-ink-subtle mt-3 text-center text-[12.5px]">{t("trialNote")}</p>

            <div className="border-line mt-7 border-t pt-6">
              <p className="text-ink text-[13.5px] font-medium">{t("featuresIntro")}</p>
              <ul className="mt-4 space-y-2.5">
                {PLAN_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                      <Check className="size-2.5" />
                    </span>
                    <span className="text-ink-muted text-[13.5px] leading-snug">
                      {t(`feature.${feature}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <p className="text-ink-subtle mx-auto mt-6 max-w-xl text-center text-[13px] leading-relaxed">
          {t("paymentsNote")}
        </p>
      </div>
    </section>
  );
}
