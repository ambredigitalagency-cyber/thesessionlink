"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, ReactNode, RefObject } from "react";

import { cn } from "@/lib/utils";

/**
 * One question at a time, and the movement between two of them.
 *
 * Both long flows in the product — setting up a profile, building an offer —
 * used to be a page of stacked fields with a "Continue" at the bottom. They
 * are now walked phase by phase, and a phase change has to read as travel in a
 * direction: going forward and going back must not look the same, or the
 * person loses track of where they are in something they have never seen
 * before.
 *
 * So the outgoing phase leaves on the side you came from and the new one
 * arrives from the side you are heading. The distance is deliberately small
 * (18px): this is a hint about direction, not a slideshow.
 *
 * `initial={false}` on the AnimatePresence matters for more than taste: it
 * stops the first phase from playing an entrance, which is what keeps the
 * slide out of the server-rendered HTML. Nothing in this file renders a style
 * that depends on the reader's motion preference — the travel is dropped by
 * `MotionConfig reducedMotion="user"` once running, and the entrances below
 * are the CSS `.rise-in`, which the browser declines by itself.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function PhaseSwitch({
  phase,
  direction,
  children,
  className,
}: {
  /** Changing this is what plays the transition. */
  phase: string;
  direction: 1 | -1;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={phase}
        initial={{ opacity: 0, x: 18 * direction }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 * direction }}
        transition={{ duration: 0.26, ease: EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Staggers the parts of a question without reading the motion preference. */
function rise(delay: number): CSSProperties {
  return { "--rise-delay": `${delay}s` } as CSSProperties;
}

function headingClass(level: 1 | 2) {
  return cn(
    "text-ink scroll-mt-24 font-semibold tracking-[-0.03em] focus:outline-none",
    level === 1
      ? "text-[27px] leading-[1.12] sm:text-[32px]"
      : "text-[21px] leading-[1.15] sm:text-[24px]",
  );
}

/**
 * The question itself.
 *
 * It takes focus when the phase changes (the caller moves focus to `ref`),
 * which is what lets keyboard and screen-reader users follow the flow instead
 * of being left behind on the button they just pressed.
 */
export function PhaseQuestion({
  title,
  hint,
  eyebrow,
  level = 2,
  ref,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  /** A short line above the question — the chosen category, a step name. */
  eyebrow?: ReactNode;
  level?: 1 | 2;
  ref?: RefObject<HTMLHeadingElement | null>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p
          style={rise(0)}
          className="rise-in text-ink-subtle text-[12px] font-medium tracking-[0.08em] uppercase"
        >
          {eyebrow}
        </p>
      ) : null}

      <div style={rise(eyebrow ? 0.05 : 0)} className="rise-in">
        {level === 1 ? (
          <h1 ref={ref} tabIndex={-1} className={headingClass(1)}>
            {title}
          </h1>
        ) : (
          <h2 ref={ref} tabIndex={-1} className={headingClass(2)}>
            {title}
          </h2>
        )}
      </div>

      {hint ? (
        <p
          style={rise(eyebrow ? 0.1 : 0.05)}
          className="rise-in text-ink-muted max-w-lg text-[14.5px] leading-relaxed"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A free-text answer, dressed like the cards beside it.
 *
 * Point 3 of the brief: a title or a price still needs a text field, but it
 * should not drop back into a grey form row in the middle of a flow made of
 * big tappable things. So the control keeps its normal behaviour and gains the
 * same surface, the same radius and the same entrance as a card.
 */
export function PhaseField({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  /** Position in the phase, for the stagger. */
  index?: number;
  className?: string;
}) {
  return (
    <div
      style={rise(0.06 + index * 0.06)}
      className={cn(
        "rise-in border-line bg-surface rounded-[var(--radius-md)] border p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
