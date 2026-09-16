"use client";

import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PLAN_LIMITS, PLAN_PRICES, PLANS, type PlanType } from "@/lib/plans/config";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./how-it-works";

/** Base is the one most pros land on, so it carries the trial and the emphasis. */
const HIGHLIGHTED: PlanType = "base";

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const tPlans = useTranslations("plans");
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          align="center"
        />

        <div className="mt-8 flex justify-center">
          <div className="border-line bg-surface inline-flex items-center gap-1 rounded-full border p-1">
            {[false, true].map((option) => (
              <button
                key={String(option)}
                type="button"
                onClick={() => setYearly(option)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                  yearly === option ? "text-ink-inverse" : "text-ink-muted hover:text-ink",
                )}
              >
                {yearly === option ? (
                  <motion.span
                    layoutId="pricing-toggle"
                    className="bg-ink absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                ) : null}
                <span className="relative">{option ? t("yearly") : t("monthly")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <PlanCard plan={plan} yearly={yearly} t={t} tPlans={tPlans} />
            </motion.div>
          ))}
        </div>

        <p className="text-ink-subtle mx-auto mt-6 max-w-xl text-center text-[13px] leading-relaxed">
          {t("paymentsNote")}
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  yearly,
  t,
  tPlans,
}: {
  plan: PlanType;
  yearly: boolean;
  t: ReturnType<typeof useTranslations<"landing.pricing">>;
  tPlans: ReturnType<typeof useTranslations<"plans">>;
}) {
  const limits = PLAN_LIMITS[plan];
  const price = PLAN_PRICES[plan];
  const highlighted = plan === HIGHLIGHTED;

  // Every bullet is derived from PLAN_LIMITS, so the page can never drift from
  // what the server actually enforces.
  const features = [
    {
      included: true,
      label:
        limits.maxOffers === null
          ? t("feature.offersUnlimited")
          : t("feature.offers", { count: limits.maxOffers }),
    },
    {
      included: true,
      label:
        limits.maxPhotosPerOffer === null
          ? t("feature.photosUnlimited")
          : t("feature.photos", { count: limits.maxPhotosPerOffer }),
    },
    { included: limits.crm, label: t("feature.crm") },
    { included: limits.reminders, label: t("feature.reminders") },
  ];

  return (
    <div
      className={cn(
        "surface-card flex h-full flex-col p-7",
        highlighted && "border-ink-strong ring-ink/10 ring-2",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink-subtle text-[13px] font-medium tracking-[0.1em] uppercase">
          {tPlans(`names.${plan}` as "names.base")}
        </p>
        {highlighted ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-ink)]">
            {t("trialBadge")}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-ink text-[42px] leading-none font-semibold tracking-[-0.04em]">
          {price.monthly === 0
            ? t("freePrice")
            : `${yearly && price.yearly !== null ? price.yearly : price.monthly} €`}
        </span>
        {price.monthly > 0 ? (
          <span className="text-ink-muted pb-1.5 text-[14px]">
            {yearly && price.yearly !== null ? t("perYear") : t("perMonth")}
          </span>
        ) : null}
      </div>

      <p className="text-ink-muted mt-2 min-h-[2.5rem] text-[13.5px] leading-relaxed">
        {plan === "free"
          ? t("freeNote")
          : yearly && price.yearly !== null
            ? t("yearlySaving")
            : t("monthlyNote")}
      </p>

      <Button
        asChild
        size="md"
        block
        variant={highlighted ? "primary" : "secondary"}
        className="mt-5"
      >
        <Link href="/login?intent=signup">
          {plan === "free" ? t("ctaFree") : t("cta")}
          <ArrowRight className="size-4" />
        </Link>
      </Button>

      <ul className="mt-7 space-y-2.5">
        {features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                feature.included
                  ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                  : "bg-ink/5 text-ink-subtle",
              )}
            >
              {feature.included ? <Check className="size-2.5" /> : <Minus className="size-2.5" />}
            </span>
            <span
              className={cn(
                "text-[13.5px] leading-snug",
                feature.included ? "text-ink-muted" : "text-ink-subtle line-through",
              )}
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
