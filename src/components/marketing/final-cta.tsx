"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

export function FinalCta() {
  const t = useTranslations("landing.finalCta");

  return (
    <section className="bg-night text-ink-inverse relative overflow-hidden py-24 sm:py-32">
      <div className="bg-grid-inverse pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)] opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <h2 className="text-[38px] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[58px]">
          {t.rich("title", {
            accent: (chunks) => (
              <span className="display-accent text-[var(--accent)]">{chunks}</span>
            ),
          })}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/60">
          {t("subtitle")}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="inverse">
            <Link href="/login?intent=signup">
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="text-[13px] text-white/45">{t("note", { price: PLAN_PRICE_MONTHLY })}</p>
        </div>
      </motion.div>
    </section>
  );
}
