"use client";

import { CalendarCheck, Link2, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "create", icon: Sparkles },
  { key: "share", icon: Link2 },
  { key: "fill", icon: CalendarCheck },
] as const;

export function HowItWorks() {
  const t = useTranslations("landing.how");
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(STEPS.length - 1, Math.floor(value * STEPS.length));
    setActive(next);
  });

  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

        {/* Mobile: plain stacked steps */}
        <ol className="mt-12 space-y-4 lg:hidden">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="surface-card p-5"
            >
              <StepContent index={index} stepKey={step.key} icon={step.icon} />
              <div className="mt-4">
                <StepVisual index={index} />
              </div>
            </motion.li>
          ))}
        </ol>

        {/* Desktop: scroll-driven sticky panel */}
        <div ref={containerRef} className="relative mt-16 hidden h-[260vh] lg:block">
          <div className="sticky top-24 grid grid-cols-2 items-center gap-16">
            <ol className="space-y-8">
              {STEPS.map((step, index) => (
                <li
                  key={step.key}
                  className={cn(
                    "relative border-l-2 pl-6 transition-all duration-500",
                    active === index ? "border-ink" : "border-line",
                  )}
                >
                  <div
                    className={cn(
                      "transition-all duration-500",
                      active === index ? "opacity-100" : "opacity-40",
                    )}
                  >
                    <StepContent index={index} stepKey={step.key} icon={step.icon} />
                  </div>
                </li>
              ))}
            </ol>

            <div className="relative h-[26rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <StepVisual index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}
    >
      {eyebrow ? (
        <p className="text-[12.5px] font-medium tracking-[0.12em] text-[var(--accent-ink)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-ink mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[42px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-ink-muted mt-4 text-[16.5px] leading-relaxed">{subtitle}</p>
      ) : null}
    </motion.div>
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
    <div>
      <div className="flex items-center gap-2.5">
        <span className="bg-ink text-ink-inverse flex size-7 items-center justify-center rounded-full text-[12px] font-semibold">
          {index + 1}
        </span>
        <Icon className="text-ink-muted size-4" />
      </div>
      <h3 className="text-ink mt-3 text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">
        {t(`steps.${stepKey}.title` as "steps.create.title")}
      </h3>
      <p className="text-ink-muted mt-2 max-w-md text-[15px] leading-relaxed">
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
            animate={{ opacity: 1, x: 0 }}
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
          animate={{ opacity: 1, y: 0 }}
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
