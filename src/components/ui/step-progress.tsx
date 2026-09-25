"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * One continuous bar for a sequence of steps, shared by the offer wizard and
 * onboarding.
 *
 * Both used to draw one small segment per step, each filling on its own. That
 * reads as four separate indicators rather than one journey, and nothing moves
 * between steps — a segment simply switches colour. A single track with a fill
 * that travels shows the distance covered and the distance left, which is the
 * only thing a progress bar is for.
 *
 * The fill is a width transition rather than a transform so it cannot blur at
 * sub-pixel widths, and it is springed so a step change feels like travel
 * rather than a jump — except when movement is unwelcome, where it lands
 * directly on the new value.
 *
 * A step can be walked in several phases — the offer builder asks three
 * questions before it is done with "Essentials". `advance` says how far
 * through the current step the person is, so the bar keeps moving on every
 * answer instead of sitting still for three screens. The labels stay at four,
 * which is the journey; the fill tells the truth about the distance.
 */
export function StepProgress({
  steps,
  current,
  advance = 1,
  onSelect,
  label,
  className,
}: {
  /** Labels in order; length decides the scale. */
  steps: readonly string[];
  /** Zero-based index of the step being shown. */
  current: number;
  /** How far through that step, 0–1. Left alone, a step is all or nothing. */
  advance?: number;
  /** Only ever called for steps already completed. */
  onSelect?: (index: number) => void;
  label: string;
  className?: string;
}) {
  const still = useReducedMotion();
  const ratio = steps.length > 0 ? (current + Math.min(1, Math.max(0, advance))) / steps.length : 0;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-valuetext={steps[current]}
        className="bg-ink/10 relative h-1.5 overflow-hidden rounded-full"
      >
        <motion.span
          className="bg-ink absolute inset-y-0 left-0 rounded-full"
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={
            still ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26, mass: 0.6 }
          }
        />

        {/*
         * A soft leading edge, so the eye catches where the fill stopped.
         *
         * Hidden through CSS rather than dropped from the tree when movement
         * is unwelcome: `useReducedMotion()` answers false on the server and
         * true in the browser, so leaving this element out in JavaScript made
         * the server's HTML and the browser's first render disagree — a real
         * hydration mismatch, visible only to the people who asked for less
         * motion. The media query cannot disagree with itself.
         */}
        <motion.span
          aria-hidden
          className="bg-ink/40 absolute inset-y-0 left-0 rounded-full blur-[3px] motion-reduce:hidden"
          initial={false}
          animate={{ width: `${Math.min(100, ratio * 100 + 2)}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 24, mass: 0.6 }}
        />
      </div>

      <ol className="flex gap-2" aria-hidden>
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;

          const content = (
            <span
              className={cn(
                "flex items-center gap-1 truncate text-[12px] font-medium transition-colors duration-300",
                active ? "text-ink" : done ? "text-ink-muted" : "text-ink-subtle",
              )}
            >
              {done ? <Check className="size-3 shrink-0" /> : null}
              {step}
            </span>
          );

          return (
            <li key={step} className="min-w-0 flex-1">
              {done && onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="hover:text-ink w-full text-left"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
