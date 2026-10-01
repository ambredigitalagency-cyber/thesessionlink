"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * The one moment in the product worth marking: the link exists.
 *
 * Deliberately small. A full-screen confetti cannon would be the obvious
 * reading of "celebration" and the wrong one here — the coach has just
 * finished a form, not won something, and the next thing they need to do is
 * read their own link. So the burst is short, contained to the card, and made
 * of the same rounded rectangles the rest of the product is drawn with. It
 * plays once, on mount, and never again.
 *
 * Under reduced motion nothing is thrown at all and the card simply appears:
 * a burst of moving objects is exactly what that preference is about.
 *
 * That last decision is taken after mount rather than during the render, and
 * that detail is not cosmetic. `useReducedMotion()` answers false on the
 * server and the truth in the browser, so deciding there whether the pieces
 * exist made the server's HTML and the browser's first render disagree — a
 * hydration mismatch only ever seen by the people who asked for less movement.
 * Waiting for mount costs nothing here: a burst that plays once on arrival has
 * nothing to show before the browser is running anyway.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const PIECES = 16;

/** False while rendering on the server and during hydration, true after. */
const NEVER_CHANGES = () => () => {};

function useHasMounted(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

/** Fixed so the burst is identical on the server and after hydration. */
const SPREAD = [-46, 31, -12, 58, -68, 7, 42, -29, 64, -55, 19, -38, 51, -7, 26, -61] as const;

export function Celebration({ children }: { children: ReactNode }) {
  const still = useReducedMotion();
  const mounted = useHasMounted();
  const burst = mounted && !still;

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, index) => ({
        x: SPREAD[index] ?? 0,
        // Deterministic variation: no Math.random(), which would differ
        // between the server render and the client and trip hydration.
        delay: 0.12 + (index % 5) * 0.045,
        duration: 1.1 + ((index * 7) % 5) * 0.12,
        rotate: (index % 2 === 0 ? 1 : -1) * (90 + (index % 4) * 45),
        size: index % 3 === 0 ? 7 : 5,
        tone:
          index % 3 === 0
            ? "var(--accent)"
            : index % 3 === 1
              ? "var(--color-ink)"
              : "color-mix(in oklab, var(--accent) 45%, white)",
      })),
    [],
  );

  return (
    <div className="relative">
      {burst ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-0">
          {pieces.map((piece, index) => (
            <motion.span
              key={index}
              className="absolute top-0 left-1/2 block rounded-[2px]"
              style={{
                width: piece.size,
                height: piece.size * 1.6,
                background: piece.tone,
              }}
              initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: `${piece.x}%`,
                y: [0, -34, 96],
                rotate: piece.rotate,
                scale: 1,
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "easeOut",
                times: [0, 0.15, 0.6, 1],
              }}
            />
          ))}
        </div>
      ) : null}

      {/* The card's own arrival keeps one shape for everyone: the amplitude is
          Motion's business (it drops the lift and the scale under the same
          preference), so nothing here changes what the server rendered. */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: still ? 0.3 : 0.6, delay: still ? 0 : 0.08, ease: EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
}
