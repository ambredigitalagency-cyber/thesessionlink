"use client";

import { useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { useSyncExternalStore, type RefObject } from "react";

/**
 * Scroll-linked movement that behaves on the server and stops when asked.
 *
 * Two things had to be got right here, and both of them bite silently:
 *
 *   * `reducedMotion="user"` on MotionConfig only neutralises animation
 *     *props* — `animate`, `whileInView`, layout transitions. A value derived
 *     from useScroll() is not an animation as far as Motion is concerned, so
 *     parallax kept moving for people who had asked the system for less of it.
 *     The preference is therefore checked by hand, here.
 *
 *   * On the server there is no scroll position and no viewport, so the
 *     transform rendered into the HTML is whatever the range starts at, while
 *     the browser measures something else the moment it hydrates. React
 *     reports that as a hydration mismatch, and it is a real one. So the value
 *     stays at zero until after mount, and a spring carries it from there to
 *     its true offset — which also turns what would be a jump on first paint
 *     into a short settle.
 */
export function useParallax(
  target: RefObject<HTMLElement | null>,
  /** Pixels of drift across the whole crossing. Negative moves against the scroll. */
  distance: number,
  options: { offset?: [string, string] } = {},
): MotionValue<number> {
  const reduced = useReducedMotion();
  const mounted = useHasMounted();

  const { scrollYProgress } = useScroll({
    target,
    offset: (options.offset ?? ["start end", "end start"]) as never,
  });

  const drift = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  // Zero before mount and whenever movement is unwelcome. Reading `drift`
  // inside keeps this subscribed to the scroll either way, so flipping
  // `mounted` needs no extra wiring.
  const gated = useTransform(drift, (value) => (mounted && !reduced ? value : 0));

  // Springing the *output* rather than the progress is what makes the initial
  // hand-over smooth; it also keeps fast scrolls from snapping.
  return useSpring(gated, { stiffness: 120, damping: 30, mass: 0.4 });
}

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * useSyncExternalStore is the tool for this rather than a state flag set from
 * an effect: React renders the server snapshot during hydration and swaps to
 * the client one only once that is finished, which is exactly the handover
 * this needs — and it keeps the setState out of the effect.
 */
const NEVER_CHANGES = () => () => {};

function useHasMounted(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}
