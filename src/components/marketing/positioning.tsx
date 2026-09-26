"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { EASE, SectionHeading } from "./section";

/**
 * Where the product sits, said out loud.
 *
 * This was the one thing the landing never told anyone: a visitor arriving
 * from a search has already seen a scheduling tool and a coaching platform,
 * and the whole question in their head is which of the two this is. The answer
 * is neither, and it is easier to show as a scale than to argue in a
 * paragraph — three columns, the middle one raised.
 *
 * No competitor is named. These are two families of tool, not two companies,
 * and the point is the gap between them rather than anyone's shortcomings.
 */

const COLUMNS = [
  { key: "cold", middle: false },
  { key: "ours", middle: true },
  { key: "heavy", middle: false },
] as const;

export function Positioning() {
  const t = useTranslations("landing.positioning");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          align="center"
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:items-center">
          {COLUMNS.map((column, index) => (
            <motion.div
              key={column.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
              className={cn(
                "surface-card flex h-full flex-col p-6 sm:p-7",
                // The middle column is the argument, so it is physically
                // bigger: taller padding, a ring, and no dimming.
                column.middle
                  ? "ring-2 ring-[var(--accent)]/25 lg:-my-6 lg:py-10"
                  : "bg-ink/[0.015] border-dashed",
              )}
            >
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                  column.middle
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                    : "bg-ink/[0.05] text-ink-subtle",
                )}
              >
                {t(`${column.key}.label` as "cold.label")}
              </span>

              {/* Three comparable headings, so the comparison survives being
                  read by a screen reader as a list. The middle one is louder
                  by size, not by being a different kind of thing. */}
              <h3
                className={cn(
                  "text-ink mt-5 font-semibold tracking-[-0.02em]",
                  column.middle ? "text-[22px]" : "text-[18px]",
                )}
              >
                {t(`${column.key}.title` as "cold.title")}
              </h3>

              <p
                className={cn(
                  "mt-3 text-[14.5px] leading-relaxed",
                  column.middle ? "text-ink-muted" : "text-ink-subtle",
                )}
              >
                {t(`${column.key}.body` as "cold.body")}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
