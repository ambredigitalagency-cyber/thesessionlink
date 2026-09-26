"use client";

import {
  CalendarCheck,
  EyeOff,
  Globe,
  MessageCircle,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { ACTION_ICONS } from "@/lib/offers/meta";
import { ACTION_TYPES, type ActionType } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

import { ACTION_GLYPHS, GLYPH_ON_DARK } from "./action-glyphs";
import { EASE, SectionHeading } from "./section";

const SMALL_FEATURES = [
  { key: "crm", icon: UsersRound },
  { key: "reminders", icon: CalendarCheck },
  { key: "pause", icon: EyeOff },
  { key: "fields", icon: SlidersHorizontal },
  { key: "whatsapp", icon: MessageCircle },
  { key: "bilingual", icon: Globe },
] as const;

/** Long enough to read the description before it moves on. */
const DWELL_MS = 5000;

export function Features() {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="bg-night text-on-night relative py-20 sm:py-28">
      <div className="bg-grid-inverse pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] opacity-40" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          tone="night"
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        <ActionShowcase />
        <SmallFeatures />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The five action types, as a menu rather than a carousel.
 *
 * They were a strip of pills over one wide panel, which made them look like
 * five views of one thing. They are not: they are five different products a
 * visitor can be sold, and choosing between them is the single decision a
 * coach makes when they publish an offer. So they are now a list you run down,
 * with the chosen one opening in place and the drawing of what it produces
 * standing beside it — the shape of a menu, because that is what it is.
 *
 * It still advances on its own so the whole set is seen without work, and
 * still stops the moment someone takes over: pointer in, keyboard focus, or a
 * system request for less movement.
 */
function ActionShowcase() {
  const t = useTranslations("landing.features");
  const tActions = useTranslations("offers.actions");
  const still = useReducedMotion();

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (still || held) return;
    const timer = setInterval(
      () => setActive((index) => (index + 1) % ACTION_TYPES.length),
      DWELL_MS,
    );
    return () => clearInterval(timer);
  }, [still, held]);

  const actionType = ACTION_TYPES[active] as ActionType;
  const Glyph = ACTION_GLYPHS[actionType];

  /** Up/down walk the menu, as a vertical tablist is expected to. */
  function onKeyDown(event: React.KeyboardEvent) {
    const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;

    event.preventDefault();
    const next = (active + delta + ACTION_TYPES.length) % ACTION_TYPES.length;
    setActive(next);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }

  return (
    <div
      className="mt-12 grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-8"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div
        ref={tabsRef}
        role="tablist"
        aria-orientation="vertical"
        aria-label={t("actionsLabel")}
        onKeyDown={onKeyDown}
        className="border-line-inverse divide-line-inverse divide-y overflow-hidden rounded-[var(--radius-lg)] border"
      >
        {ACTION_TYPES.map((type, index) => {
          const Icon = ACTION_ICONS[type];
          const selected = index === active;

          return (
            <button
              key={type}
              role="tab"
              type="button"
              id={`action-tab-${type}`}
              aria-selected={selected}
              aria-controls={`action-panel-${type}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              className={cn(
                "relative flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors",
                selected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
              )}
            >
              {/* The marker travels between rows, so the menu reads as one
                  choice moving rather than five states blinking. */}
              {selected ? (
                <motion.span
                  layoutId="action-marker"
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-0.5 bg-[var(--accent)]"
                  transition={{ duration: 0.35, ease: EASE }}
                />
              ) : null}

              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  selected ? "bg-[var(--accent)] text-[var(--accent-on)]" : "bg-white/[0.06]",
                )}
              >
                <Icon className={cn("size-4", !selected && "text-white/60")} />
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[16px] font-semibold tracking-[-0.015em] transition-colors",
                    selected ? "text-on-night" : "text-white/70",
                  )}
                >
                  {tActions(`${type}.label`)}
                </span>

                {/* The description belongs to the chosen row, not to a panel
                    somewhere else on the page. */}
                <AnimatePresence initial={false}>
                  {selected ? (
                    <motion.span
                      key="description"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="block overflow-hidden text-[13.5px] leading-relaxed text-white/60"
                    >
                      <span className="mt-1.5 block">{tActions(`${type}.description`)}</span>
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>

      {/* What the visitor ends up seeing, drawn. */}
      <div className="border-line-inverse bg-night-soft grid min-h-[17rem] overflow-hidden rounded-[var(--radius-lg)] border lg:min-h-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={actionType}
            id={`action-panel-${actionType}`}
            role="tabpanel"
            aria-labelledby={`action-tab-${actionType}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-7 p-7"
          >
            <div style={GLYPH_ON_DARK}>
              <Glyph className="h-32 w-48 sm:h-40 sm:w-64" />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[11.5px] tracking-[0.1em] text-white/35 uppercase">
                {t("onYourPage")}
              </span>
              <span
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--accent-on)]"
                style={{ background: "var(--accent)" }}
              >
                {tActions(`${actionType}.label`)}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The rest of the product, as a list rather than six more boxes.
 *
 * These are small facts, and a box around each one gave them the same weight
 * as the action types above. Hairlines and two columns let the eye run down
 * them instead of stopping six times.
 */
function SmallFeatures() {
  const t = useTranslations("landing.features");

  return (
    <ul className="mt-14 grid gap-x-12 sm:grid-cols-2">
      {SMALL_FEATURES.map(({ key, icon: Icon }, index) => (
        <motion.li
          key={key}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: (index % 2) * 0.08, ease: EASE }}
          className="border-line-inverse flex items-start gap-3.5 border-t py-5"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <Icon className="size-4 text-[var(--accent)]" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
              {t(`items.${key}.title` as "items.crm.title")}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
              {t(`items.${key}.body` as "items.crm.body")}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
