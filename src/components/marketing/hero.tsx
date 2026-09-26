"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import { cn } from "@/lib/utils";

import { DemoProfile } from "./demo-profile";
import { useParallax } from "./parallax";
import { EASE } from "./section";

/**
 * The hero, rebuilt around the thing being sold.
 *
 * It used to be a column of claims with the demo pushed to the right, at half
 * width, where it read as an illustration. But the demo *is* the argument:
 * it is the page a visitor would land on, and it works — you can book in it.
 * So the words now sit centred and short above it, and the demo takes the
 * middle of the stage at full size, with three annotations naming what each
 * part of it is. A reader who only looks at the picture still learns what the
 * product is; a reader who only reads the headline still knows what it does.
 *
 * The annotations are decoration on a phone, where there is no room beside the
 * card, so they turn into a plain list underneath — same words, no pointing.
 */
export function Hero() {
  const t = useTranslations("landing.hero");
  const sectionRef = useRef<HTMLElement>(null);

  // The backdrop drifts a little slower than the page. Neutralised by
  // useParallax() when the system asks for less movement.
  const gridY = useParallax(sectionRef, 40);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
      <motion.div
        style={{ y: gridY }}
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-70"
      />

      {/* A wash of accent behind the headline. Atmosphere only, and static:
          a loop this large is the kind of movement people turn off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[90px]"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="border-line bg-surface text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium"
          >
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            {t("badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            className="text-ink mt-5 text-[40px] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[60px]"
          >
            {t("title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            className="text-ink-muted mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-[18px]"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
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
            className="text-ink-muted mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13.5px]"
          >
            {["noCommission", "setup", "anyJob"].map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span className="bg-ink/30 size-1 rounded-full" />
                {t(`points.${key}` as "points.noCommission")}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* The stage. */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.24, ease: EASE }}
          className="relative mx-auto mt-14 max-w-5xl"
        >
          <Annotation side="left" className="lg:top-14" text={t("annotations.profile")} />
          <Annotation side="left" className="lg:top-[19rem]" text={t("annotations.offers")} />
          {/* Aligned with the offer's call to action, which is the thing it
              is talking about. */}
          <Annotation side="right" className="lg:top-[22.5rem]" text={t("annotations.booking")} />

          <DemoProfile />

          <p className="text-ink-subtle mt-4 text-center text-[12.5px]">{t("liveHint")}</p>

          {/* Same three labels, without the pointing, where there is no margin
              to point from. */}
          <ul className="text-ink-muted mx-auto mt-6 max-w-sm space-y-2 text-[13px] lg:hidden">
            {["profile", "offers", "booking"].map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                {t(`annotations.${key}` as "annotations.profile")}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * A label in the margin with a hairline running toward the card.
 *
 * Hidden below `lg` rather than reflowed: an annotation that no longer points
 * at anything is just a caption, and there is a caption list for that.
 */
function Annotation({
  side,
  text,
  className,
}: {
  side: "left" | "right";
  text: string;
  className?: string;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, x: side === "left" ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
      className={cn(
        "absolute hidden w-52 items-center gap-3 lg:flex",
        side === "left" ? "left-0 flex-row-reverse text-right" : "right-0 text-left",
        className,
      )}
    >
      {/* The dot always ends up on the side facing the card. */}
      <span className={cn("flex shrink-0 items-center", side === "right" && "flex-row-reverse")}>
        <span className="bg-line-strong h-px w-8" />
        <span className="size-1.5 rounded-full bg-[var(--accent)]" />
      </span>
      <span className="text-ink-muted text-[12.5px] leading-snug">{text}</span>
    </motion.div>
  );
}
