"use client";

import { CalendarCheck, Link2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { EASE, SectionHeading } from "./section";

const STEPS = [
  { key: "create", icon: Sparkles },
  { key: "share", icon: Link2 },
  { key: "fill", icon: CalendarCheck },
] as const;

/**
 * Three steps, as three rows.
 *
 * The previous version was a scroll-driven sticky panel: 260vh of page in
 * which the three steps swapped as you scrolled past. It looked expensive and
 * it cost the reader something — you could not skim it, you could not get to
 * step three without scrolling through one and two, and on a phone it fell
 * back to a plain stack anyway, so the effect only existed for half the
 * audience. Three rows, alternating sides, say the same thing in a third of
 * the scroll and read identically on every screen.
 *
 * The numbered rail survives, as a line down the left of the row on desktop:
 * it is what made the sequence feel like a sequence rather than three cards.
 */
export function HowItWorks() {
  const t = useTranslations("landing.how");

  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

        <ol className="mt-14 space-y-14 sm:space-y-20">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: EASE }}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
            >
              <div className={cn(index % 2 === 1 && "lg:order-2")}>
                <StepContent index={index} stepKey={step.key} icon={step.icon} />
              </div>

              <div className={cn("h-[20rem] sm:h-[23rem]", index % 2 === 1 && "lg:order-1")}>
                <StepVisual index={index} />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepContent({
  index,
  stepKey,
  icon: Icon,
}: {
  index: number;
  stepKey: string;
  icon: typeof Sparkles;
}) {
  const t = useTranslations("landing.how");

  return (
    <div className="border-line relative lg:border-l lg:pl-7">
      {/* The number sits on the rule, so three rows read as one sequence. */}
      <span className="bg-ink text-ink-inverse flex size-8 items-center justify-center rounded-full text-[13px] font-semibold lg:absolute lg:top-0 lg:-left-4">
        {index + 1}
      </span>

      <Icon className="mt-4 size-5 text-[var(--accent-ink)] lg:mt-1" aria-hidden />

      <h3 className="text-ink mt-3 text-[24px] leading-tight font-semibold tracking-[-0.025em] sm:text-[28px]">
        {t(`steps.${stepKey}.title` as "steps.create.title")}
      </h3>
      <p className="text-ink-muted mt-3 max-w-md text-[15.5px] leading-relaxed">
        {t(`steps.${stepKey}.body` as "steps.create.body")}
      </p>
    </div>
  );
}

/** Abstract UI snapshots — no screenshots to keep, they stay in sync with the product. */
function StepVisual({ index }: { index: number }) {
  const t = useTranslations("landing.how");

  if (index === 0) {
    return (
      <div className="surface-card flex h-full flex-col gap-3 p-5">
        <div className="bg-ink/10 h-2 w-20 rounded-full" />
        <div className="border-line rounded-[var(--radius-md)] border p-3.5">
          <div className="bg-ink/15 h-2.5 w-28 rounded-full" />
          <div className="bg-ink/8 mt-2.5 h-2 w-full rounded-full" />
          <div className="bg-ink/8 mt-1.5 h-2 w-3/4 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["calendar_booking", "direct_reservation", "contact_request", "quote_request"].map(
            (key, position) => (
              <div
                key={key}
                className={cn(
                  "rounded-[var(--radius-sm)] border p-2.5 text-[11.5px] font-medium",
                  position === 0
                    ? "border-ink bg-ink/[0.04] text-ink"
                    : "border-line text-ink-subtle",
                )}
              >
                {t(`visuals.actions.${key}` as "visuals.actions.calendar_booking")}
              </div>
            ),
          )}
        </div>
        <div className="bg-ink mt-auto h-9 rounded-full" />
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="surface-card flex h-full flex-col justify-center gap-4 p-6">
        <div className="border-line-strong bg-canvas flex items-center gap-2 rounded-full border px-4 py-2.5">
          <Link2 className="text-ink-subtle size-3.5" />
          <span className="text-ink text-[13px] font-medium">thesessionlink.com/ana-coach</span>
        </div>
        {["instagram", "signature", "whatsapp", "qr"].map((key, position) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + position * 0.08, duration: 0.4 }}
            className="border-line flex items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3"
          >
            <span className="size-7 rounded-full bg-[var(--accent-soft)]" />
            <span className="text-ink-muted text-[13px]">
              {t(`visuals.places.${key}` as "visuals.places.instagram")}
            </span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="surface-card flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="bg-ink/15 h-2.5 w-24 rounded-full" />
        <div className="bg-success-soft h-6 w-16 rounded-full" />
      </div>
      {[0, 1, 2].map((row) => (
        <motion.div
          key={row}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 * row, duration: 0.4 }}
          className="border-line flex items-center gap-3 rounded-[var(--radius-md)] border p-3"
        >
          <div className="bg-ink/[0.04] flex size-11 flex-col items-center justify-center rounded-[var(--radius-xs)]">
            <span className="text-ink-muted text-[10px]">{t("visuals.day")}</span>
            <span className="text-ink text-[12px] font-semibold">{9 + row}:00</span>
          </div>
          <div className="flex-1">
            <div className="bg-ink/12 h-2.5 w-24 rounded-full" />
            <div className="bg-ink/8 mt-1.5 h-2 w-32 rounded-full" />
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[10.5px] font-medium",
              row === 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
            )}
          >
            {t(`visuals.status.${row === 0 ? "pending" : "confirmed"}` as "visuals.status.pending")}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
