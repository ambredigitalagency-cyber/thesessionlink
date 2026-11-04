"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PLAN_FEATURES, PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

import { SectionPill } from "./all-in-one";
import { EASE, SectionHeading } from "./section";

/**
 * One plan, one card. The price as Paddle bills it — Paddle is the seller of
 * record and adds or includes VAT depending on the buyer's country (tax mode
 * "location"), so the card says exactly that rather than "incl. VAT" or
 * "excl. VAT", which would each be wrong for half the visitors. The trial
 * asks for a card, and the card says so too.
 */
export function Pricing() {
  const t = useTranslations("landing.pricing");

  return (
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <SectionPill>{t("pill")}</SectionPill>
        </div>
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          align="center"
          className="mt-4"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="surface-card mx-auto mt-12 max-w-md rounded-[2rem] p-7 ring-2 ring-[color-mix(in_oklab,var(--accent)_25%,transparent)] sm:p-9"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-ink-subtle text-[13px] font-medium tracking-[0.1em] uppercase">
              {t("planName")}
            </p>
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-ink)]">
              {t("trialBadge")}
            </span>
          </div>

          <p className="mt-5 flex items-baseline gap-1.5">
            <span className="text-ink text-[56px] leading-none font-semibold tracking-[-0.05em]">
              {PLAN_PRICE_MONTHLY} €
            </span>
            <span className="text-ink-muted text-[16px]">{t("perMonth")}</span>
          </p>
          <p className="text-ink-subtle mt-2 text-[12.5px] leading-relaxed">{t("tax")}</p>

          <ul className="mt-7 space-y-3">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="text-ink flex items-start gap-3 text-[14.5px]">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                  <Check className="size-3" aria-hidden />
                </span>
                {t(`features.${feature}`)}
              </li>
            ))}
          </ul>

          <Button asChild size="lg" block className="mt-8">
            <Link href="/login?intent=signup">
              {t("cta")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <p className="text-ink-subtle mt-3 text-center text-[12.5px] leading-relaxed">
            {t("note")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
