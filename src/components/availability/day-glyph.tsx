"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";

import type { DayRange } from "@/lib/scheduling/weekly";
import { minutesOf } from "@/lib/scheduling/time-off";

/**
 * One day of the week, drawn: a calendar sheet with the day's opening hours
 * laid on a 24-hour strip.
 *
 * Same family as the action glyphs of the offer builder (accent-soft sheet,
 * accent line at 28 %, filled accent for what matters), so the hours screen
 * and the "what happens when a client clicks" screen read as one product. It
 * is not only decoration: the strip is the real hours, and it follows the
 * slider while it moves. A closed day turns to grey and its strip empties.
 *
 * Decoration all the same for assistive tech — aria-hidden, the card's text
 * says the hours. The strip slides with Motion; under reduced motion the
 * duration is zeroed (in the transition, never in `initial`, which would make
 * the server and the browser disagree — see action-glyphs.tsx).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const TRACK = { x: 13, y: 31, width: 46, height: 7 };

const OPEN = {
  "--day-surface": "var(--accent-soft)",
  "--day-line": "color-mix(in oklab, var(--accent) 28%, transparent)",
  "--day-muted": "color-mix(in oklab, var(--accent) 22%, transparent)",
  "--day-accent": "var(--accent)",
} as CSSProperties;

const CLOSED = {
  "--day-surface": "color-mix(in oklab, var(--color-ink) 3%, transparent)",
  "--day-line": "color-mix(in oklab, var(--color-ink) 14%, transparent)",
  "--day-muted": "color-mix(in oklab, var(--color-ink) 7%, transparent)",
  "--day-accent": "color-mix(in oklab, var(--color-ink) 22%, transparent)",
} as CSSProperties;

const paint = "motion-safe:transition-[fill,stroke] motion-safe:duration-200";

function span(range: DayRange) {
  const from = minutesOf(range.start);
  const to = minutesOf(range.end);
  return {
    x: TRACK.x + (TRACK.width * from) / 1440,
    width: Math.max(2.5, (TRACK.width * (to - from)) / 1440),
  };
}

export function DayGlyph({
  ranges,
  className,
}: {
  ranges: readonly DayRange[];
  className?: string;
}) {
  const still = useReducedMotion();
  const open = ranges.length > 0;

  return (
    <svg
      viewBox="0 0 72 52"
      fill="none"
      aria-hidden
      className={className}
      style={{ overflow: "visible", ...(open ? OPEN : CLOSED) }}
    >
      {/* The sheet, its header band, then the outline over both. */}
      <rect
        x="6"
        y="8"
        width="60"
        height="40"
        rx="8"
        className={`fill-[var(--day-surface)] ${paint}`}
      />
      <path
        d="M6 16a8 8 0 0 1 8-8h44a8 8 0 0 1 8 8v3H6z"
        className={`fill-[var(--day-muted)] ${paint}`}
      />
      <rect
        x="6"
        y="8"
        width="60"
        height="40"
        rx="8"
        strokeWidth="1.5"
        className={`stroke-[var(--day-line)] ${paint}`}
      />
      <rect
        x="21"
        y="4"
        width="4"
        height="8"
        rx="2"
        className={`fill-[var(--day-accent)] ${paint}`}
      />
      <rect
        x="47"
        y="4"
        width="4"
        height="8"
        rx="2"
        className={`fill-[var(--day-accent)] ${paint}`}
      />

      {/* The day, midnight to midnight, and its open hours on it. */}
      <rect {...TRACK} rx={TRACK.height / 2} className={`fill-[var(--day-muted)] ${paint}`} />
      {ranges.map((range, index) => (
        <motion.rect
          key={index}
          y={TRACK.y}
          height={TRACK.height}
          rx={TRACK.height / 2}
          className="fill-[var(--day-accent)]"
          initial={false}
          animate={span(range)}
          transition={{ duration: still ? 0 : 0.3, ease: EASE }}
        />
      ))}

      {/* Morning, noon, evening. */}
      {[6, 12, 18].map((hour) => {
        const x = TRACK.x + (TRACK.width * hour) / 24;
        return (
          <line
            key={hour}
            x1={x}
            x2={x}
            y1="41.5"
            y2="44"
            strokeWidth="1.2"
            strokeLinecap="round"
            className={`stroke-[var(--day-line)] ${paint}`}
          />
        );
      })}
    </svg>
  );
}
