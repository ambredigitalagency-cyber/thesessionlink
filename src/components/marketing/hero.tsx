"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";

import { DemoProfile } from "./demo-profile";

export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[38rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-70" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="border-line bg-surface text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
          >
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            {t("badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-ink mt-5 text-[40px] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[56px]"
          >
            {t("title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-ink-muted mt-6 max-w-lg text-[17px] leading-relaxed sm:text-[18px]"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button asChild size="lg">
              <Link href="/login?intent=signup">
                {t("cta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-ink-subtle text-[13px]">
              {t("ctaNote", { price: PLAN_PRICE_MONTHLY })}
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-ink-muted mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]"
          >
            {["noCommission", "setup", "anyJob"].map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span className="bg-ink/30 size-1 rounded-full" />
                {t(`points.${key}` as "points.noCommission")}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <DemoProfile />
        </motion.div>
      </div>
    </section>
  );
}
