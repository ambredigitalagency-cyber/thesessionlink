"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type PointerEvent } from "react";

/**
 * The landing's small interactive touches, in one place.
 *
 * Each one degrades to nothing: the spotlight is CSS that only exists for a
 * hovering pointer with motion allowed, the progress bar is a position (not an
 * animation) and the counter shows its final figure outright when the reader
 * asked for less movement.
 */

/** Feeds `.spotlight` (globals.css) the pointer position inside the card. */
export function useSpotlight() {
  return (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };
}

/** A hairline at the top of the page that fills as the reader scrolls. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  // The spring only smooths the bar's movement; with reduced motion the bar
  // follows the scroll position exactly.
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-[var(--accent)]"
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
    />
  );
}

/**
 * A number that counts up to its value the first time it scrolls into view.
 * The server renders the final value, so it is right before hydration and for
 * anyone who never sees the animation.
 */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const current = useMotionValue(value);
  const text = useTransform(current, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (!inView || reduce) return;
    current.set(0);
    const controls = animate(current, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, reduce, value, current]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
