"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Small drawings for the three lists that can legitimately be empty.
 *
 * Same language as the action glyphs on the landing — rounded rectangles, one
 * accented element, a single idea per drawing — but deliberately quieter:
 * these sit inside the product, where the illustration is scenery and the
 * button beside it is the point. They are aria-hidden and the message always
 * carries the meaning.
 *
 * The dashboard is neutral by decision, so these draw in ink and never in the
 * profile's accent: only the one element worth pointing at is coloured, with
 * the brand coral rather than whatever the coach picked for their page.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type Props = { className?: string };

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 132 92" fill="none" aria-hidden className={className}>
      {children}
    </svg>
  );
}

/**
 * Reveal helper: draws the piece into place, or lands it there at once.
 *
 * The from-state is the same whatever the reader prefers, and only the timing
 * changes. Choosing in JavaScript whether a piece starts lifted means the
 * server writes one transform and the browser hydrates another, which React
 * reports as a hydration mismatch — and only for the people who asked for less
 * movement. Motion drops the lift itself under that preference; all this has to
 * do is stop staggering.
 */
function useEntrance() {
  const still = useReducedMotion();
  return (delay: number) => ({
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: still ? 0 : delay, duration: still ? 0.2 : 0.45, ease: EASE },
  });
}

/** An empty offer list: a page with room for cards that are not there yet. */
export function NoOffersArt({ className }: Props) {
  const entrance = useEntrance();

  return (
    <Frame className={className}>
      <rect
        x="26"
        y="6"
        width="80"
        height="80"
        rx="10"
        className="fill-ink/[0.03] stroke-ink/10"
        strokeWidth="1.5"
      />
      <motion.rect
        {...entrance(0.05)}
        x="38"
        y="18"
        width="30"
        height="4"
        rx="2"
        className="fill-ink/25"
      />

      {/* Two filled rows, then the dashed slot waiting for the first offer. */}
      {[0, 1].map((row) => (
        <motion.g key={row} {...entrance(0.12 + row * 0.08)}>
          <rect
            x="38"
            y={32 + row * 17}
            width="56"
            height="13"
            rx="4"
            className="fill-ink/[0.06] stroke-ink/10"
            strokeWidth="1"
          />
          <rect x="44" y={37 + row * 17} width="22" height="3" rx="1.5" className="fill-ink/20" />
        </motion.g>
      ))}

      <motion.rect
        {...entrance(0.3)}
        x="38"
        y="66"
        width="56"
        height="13"
        rx="4"
        className="stroke-[var(--color-brand)]"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />
      <motion.path
        {...entrance(0.4)}
        d="M66 69.5 v6 M63 72.5 h6"
        className="stroke-[var(--color-brand)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Frame>
  );
}

/** An empty agenda: a week with nothing in it yet. */
export function NoBookingsArt({ className }: Props) {
  const entrance = useEntrance();

  return (
    <Frame className={className}>
      <rect
        x="14"
        y="12"
        width="104"
        height="68"
        rx="10"
        className="fill-ink/[0.03] stroke-ink/10"
        strokeWidth="1.5"
      />
      <rect x="14" y="12" width="104" height="13" rx="10" className="fill-ink/[0.05]" />
      <rect x="22" y="17" width="18" height="3" rx="1.5" className="fill-ink/20" />

      {Array.from({ length: 12 }, (_, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const highlight = index === 5;

        return (
          <motion.rect
            key={index}
            {...entrance(0.1 + index * 0.025)}
            x={23 + column * 23}
            y={33 + row * 15}
            width="17"
            height="9"
            rx="3"
            className={highlight ? "fill-[var(--color-brand)]/70" : "fill-ink/[0.07]"}
          />
        );
      })}
    </Frame>
  );
}

/** An empty client list: one card, still blank. */
export function NoClientsArt({ className }: Props) {
  const entrance = useEntrance();

  return (
    <Frame className={className}>
      <rect
        x="20"
        y="16"
        width="92"
        height="60"
        rx="10"
        className="fill-ink/[0.03] stroke-ink/10"
        strokeWidth="1.5"
      />

      <motion.circle
        {...entrance(0.08)}
        cx="44"
        cy="40"
        r="11"
        className="fill-[var(--color-brand)]/15 stroke-[var(--color-brand)]/40"
        strokeWidth="1.5"
      />
      <motion.path
        {...entrance(0.18)}
        d="M44 36.5 a3.2 3.2 0 1 1 0 6.4 a3.2 3.2 0 1 1 0 -6.4 M37.5 48 a6.5 6.5 0 0 1 13 0"
        className="stroke-[var(--color-brand)]"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {[0, 1].map((line) => (
        <motion.rect
          key={line}
          {...entrance(0.24 + line * 0.08)}
          x="64"
          y={34 + line * 11}
          width={line === 0 ? 36 : 24}
          height="4"
          rx="2"
          className={line === 0 ? "fill-ink/20" : "fill-ink/10"}
        />
      ))}
    </Frame>
  );
}
