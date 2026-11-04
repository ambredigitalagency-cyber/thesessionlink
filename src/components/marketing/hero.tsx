"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

import { LiveDemo } from "./live-demo";
import { useParallax } from "./parallax";
import { EASE } from "./section";

/**
 * The first screen: the promise in one line, one button, and the product
 * itself — a real page, drawn by the same renderer coaches get, for the trade
 * the visitor picks. The headline, the pill and the button come straight in;
 * the demo follows a beat later so the words are read first.
 */
export function Hero({ linkBase }: { linkBase: string }) {
  const t = useTranslations("landing.hero");
  const sectionRef = useRef<HTMLElement>(null);
  const gridY = useParallax(sectionRef, 40);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-24">
      <motion.div
        style={{ y: gridY }}
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[90px]"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="border-line bg-surface text-ink-muted inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
          >
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <span className="truncate font-mono">
              {linkBase}/<span className="text-ink">{t("pillName")}</span>
            </span>
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            className="text-ink mt-5 text-[40px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[58px]"
          >
            {t("title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            className="text-ink-muted mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-[18px] lg:mx-0"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
            className="mt-8 flex flex-col items-center gap-3 lg:items-start"
          >
            {/* The glow sits behind the button and does not move: a halo, not a pulse. */}
            <span className="relative inline-flex">
              <span
                aria-hidden
                className="absolute -inset-3 rounded-full opacity-45 blur-xl"
                style={{ background: "var(--accent)" }}
              />
              <Button asChild size="lg" className="relative h-14 px-7 text-[16px]">
                <Link href="/login?intent=signup">
                  <span aria-hidden className="size-2 rounded-full bg-[var(--accent)]" />
                  {t("cta")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </span>
            <p className="text-ink-subtle text-[13px]">{t("ctaNote")}</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.24, ease: EASE }}
        >
          <LiveDemo />
        </motion.div>
      </div>
    </section>
  );
}
