"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/*
 * The two small moving pieces of the statistics cards, shared by the
 * Statistics page and the landing's preview of it.
 */

/** Counts up from zero once, unless the reader asked for less movement. */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const still = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (still || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, still, format]);
  return <span ref={ref}>{format(value)}</span>;
}

/** A line of the period, for the cards: shape only, the numbers are beside it. */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const width = 120;
  const height = 32;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map(
    (value, index) =>
      `${(index * step).toFixed(1)},${(height - (value / max) * (height - 4) - 2).toFixed(1)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-28"
      aria-hidden
      preserveAspectRatio="none"
    >
      <motion.polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
