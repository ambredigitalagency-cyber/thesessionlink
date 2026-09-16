"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./how-it-works";

const INCLUDED = [
  "offers",
  "actions",
  "calendar",
  "crm",
  "emails",
  "branding",
  "languages",
  "support",
] as const;

export function Pricing() {
  const t = useTranslations("landing.pricing");
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 max-w-xl"
        >
          <div className="surface-card overflow-hidden">
            <div className="border-line border-b p-7 text-center sm:p-9">
              <p className="text-ink-subtle text-[13px] font-medium tracking-[0.1em] uppercase">
                {t("planName")}
              </p>

              <div className="mt-4 flex items-end justify-center gap-1.5">
                <motion.span
                  key={String(yearly)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-ink text-[52px] leading-none font-semibold tracking-[-0.04em]"
                >
                  {yearly ? "144 €" : "15 €"}
                </motion.span>
                <span className="text-ink-muted pb-2 text-[15px]">
                  {yearly ? t("perYear") : t("perMonth")}
                </span>
              </div>

              <p className="text-ink-muted mt-2 text-[13.5px]">
                {yearly ? t("yearlySaving") : t("monthlyNote")}
              </p>

              <Button asChild size="lg" block className="mt-6">
                <Link href="/login?intent=signup">
                  {t("cta")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <p className="text-ink-subtle mt-3 text-[12.5px]">{t("trial")}</p>
            </div>

            <ul className="grid gap-2.5 p-7 sm:grid-cols-2 sm:p-9">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                    <Check className="size-2.5" />
                  </span>
                  <span className="text-ink-muted text-[13.5px] leading-snug">
                    {t(`included.${item}` as "included.offers")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-ink-subtle mt-5 text-center text-[13px] leading-relaxed">
            {t("paymentsNote")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
