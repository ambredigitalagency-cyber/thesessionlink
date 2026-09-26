"use client";

import { ArrowRight, Check, Link2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { EASE } from "./section";

/**
 * The section the old landing never had: what this replaces.
 *
 * Every claim further down — the offers, the slots, the client records —
 * only lands if the reader has first recognised their own week in the page.
 * So the section shows it rather than asserting it: four real messages,
 * stacked at angles the way an inbox actually feels, and then the same four
 * questions answered once by a link.
 *
 * The bubbles are tilted with static classes, not with a random seed: a layout
 * that changes between the server and the browser is a hydration mismatch, and
 * the disorder only has to look unplanned, not be unplanned.
 */

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"] as const;
const OFFSETS = ["ml-0", "ml-8", "ml-3", "ml-10"] as const;

export function Problem() {
  const t = useTranslations("landing.problem");

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12.5px] font-medium tracking-[0.12em] text-[var(--accent-ink)] uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="text-ink mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[42px]">
            {t("title")}
          </h2>
        </motion.div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
          {/* Before: the inbox. */}
          <div>
            <p className="text-ink-subtle mb-4 text-[11.5px] font-medium tracking-[0.12em] uppercase">
              {t("todayLabel")}
            </p>

            <ul className="space-y-2.5">
              {[0, 1, 2, 3].map((index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: EASE }}
                  className={cn(
                    "border-line bg-surface text-ink max-w-[18rem] rounded-[1.1rem] rounded-bl-[0.35rem] border px-4 py-2.5 text-[13.5px] shadow-[var(--shadow-card)]",
                    TILTS[index],
                    OFFSETS[index],
                  )}
                >
                  {t(`messages.${index}` as "messages.0")}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* The hinge. A rule on a phone, an arrow once there are columns. */}
          <div aria-hidden className="flex items-center justify-center">
            <span className="bg-line h-px w-full lg:hidden" />
            <span className="border-line bg-surface text-ink-subtle hidden size-10 items-center justify-center rounded-full border lg:flex">
              <ArrowRight className="size-4" />
            </span>
          </div>

          {/* After: the link. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE }}
            className="surface-card p-6 sm:p-7"
          >
            <p className="text-[11.5px] font-medium tracking-[0.12em] text-[var(--accent-ink)] uppercase">
              {t("afterLabel")}
            </p>

            <div className="border-line-strong bg-canvas mt-4 flex items-center gap-2 rounded-full border px-4 py-2.5">
              <Link2 className="text-ink-subtle size-3.5 shrink-0" />
              <span className="text-ink truncate text-[13px] font-medium">
                thesessionlink.com/ana-coach
              </span>
            </div>

            <h3 className="text-ink mt-5 text-[20px] leading-snug font-semibold tracking-[-0.02em]">
              {t("afterTitle")}
            </h3>
            <p className="text-ink-muted mt-2 text-[14.5px] leading-relaxed">{t("afterBody")}</p>

            <ul className="mt-5 space-y-2.5">
              {[0, 1, 2].map((index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                    <Check className="size-2.5" />
                  </span>
                  <span className="text-ink-muted text-[13.5px] leading-snug">
                    {t(`afterPoints.${index}` as "afterPoints.0")}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
