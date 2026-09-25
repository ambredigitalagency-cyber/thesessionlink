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

const SMALL_FEATURES = [
  { key: "crm", icon: UsersRound },
  { key: "reminders", icon: CalendarCheck },
  { key: "pause", icon: EyeOff },
  { key: "fields", icon: SlidersHorizontal },
  { key: "whatsapp", icon: MessageCircle },
  { key: "bilingual", icon: Globe },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;
/** Long enough to read the description before it moves on. */
const DWELL_MS = 5000;

export function Features() {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="bg-night text-ink-inverse relative py-20 sm:py-28">
      <div className="bg-grid-inverse pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] opacity-40" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="max-w-2xl"
        >
          <p className="text-[12.5px] font-medium tracking-[0.12em] text-[var(--accent)] uppercase">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[42px]">
            {t("title")}
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-white/60">{t("subtitle")}</p>
        </motion.div>

        <ActionShowcase />
        <SmallFeatures />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The five action types, shown one at a time instead of as five cards.
 *
 * Five boxes in a row said "here is a list"; a coach reading it had to imagine
 * what each one produced. One at a time, with the thing it produces drawn
 * beside it, says "here is what your page will do" — and the five become a
 * choice the reader makes rather than a grid they skim.
 *
 * It advances on its own so the whole set is seen without work, and stops the
 * moment someone takes over: pointer in, keyboard focus, or a system request
 * for less movement.
 */
function ActionShowcase() {
  const t = useTranslations("landing.features");
  const tActions = useTranslations("offers.actions");
  const still = useReducedMotion();

  const [active, setActive] = useState<number>(0);
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

  /** Left/right walk the strip, as a tablist is expected to. */
  function onKeyDown(event: React.KeyboardEvent) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;

    event.preventDefault();
    const next = (active + delta + ACTION_TYPES.length) % ACTION_TYPES.length;
    setActive(next);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }

  return (
    <div
      className="mt-12"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={t("actionsLabel")}
        onKeyDown={onKeyDown}
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
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
                "relative shrink-0 snap-start rounded-full px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors",
                selected ? "text-night" : "text-white/55 hover:text-white/85",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="action-pill"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ duration: 0.4, ease: EASE }}
                />
              ) : null}
              <span className="relative flex items-center gap-2">
                <Icon className="size-3.5" />
                {tActions(`${type}.label`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* The two panels share one grid cell so they cross-fade over each other.
          `mode="wait"` was the obvious choice and the wrong one: it unmounts
          the outgoing panel before mounting the next, which left the box empty
          for a third of a second on every change. */}
      <div className="border-line-inverse bg-night-soft mt-4 grid min-h-[15rem] overflow-hidden rounded-[var(--radius-lg)] border sm:min-h-[13rem]">
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
            className="col-start-1 row-start-1 grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:gap-10 sm:p-8"
          >
            <div>
              <h3 className="text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
                {tActions(`${actionType}.label`)}
              </h3>
              <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-white/60">
                {tActions(`${actionType}.description`)}
              </p>

              {/* What the visitor actually sees on the public page. */}
              <div className="mt-6 flex items-center gap-2.5">
                <span className="text-[11.5px] tracking-[0.1em] text-white/35 uppercase">
                  {t("onYourPage")}
                </span>
                <span
                  className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {tActions(`${actionType}.label`)}
                </span>
              </div>
            </div>

            <div style={GLYPH_ON_DARK} className="justify-self-center sm:justify-self-end">
              <Glyph className="h-32 w-48 sm:h-40 sm:w-64" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Which of the five is showing, without reading the strip again. */}
      <div className="mt-3 flex justify-center gap-1.5 sm:justify-start">
        {ACTION_TYPES.map((type, index) => (
          <span
            key={type}
            aria-hidden
            className={cn(
              "h-1 rounded-full transition-all duration-500",
              index === active ? "w-6 bg-white/70" : "w-1.5 bg-white/20",
            )}
          />
        ))}
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
