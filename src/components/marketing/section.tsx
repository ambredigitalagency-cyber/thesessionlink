"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The one heading the landing uses, wherever a section starts.
 *
 * It lived inside how-it-works before, which meant three other sections
 * imported a section to get a heading. It is the page's most reused piece, so
 * it now sits on its own — and knows about the dark band, since the band is a
 * surface and not a different design.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  tone = "paper",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  tone?: "paper" | "night";
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow ? (
        <p
          className={cn(
            "text-[12.5px] font-medium tracking-[0.12em] uppercase",
            tone === "night" ? "text-[var(--accent)]" : "text-[var(--accent-ink)]",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          "mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[42px]",
          tone === "night" ? "text-on-night" : "text-ink",
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          className={cn(
            "mt-4 text-[16.5px] leading-relaxed",
            tone === "night" ? "text-white/60" : "text-ink-muted",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </motion.div>
  );
}
