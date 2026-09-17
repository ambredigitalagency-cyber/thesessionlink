"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * The CSS `prefers-reduced-motion` block in globals.css only reaches CSS
 * animations and transitions. Motion animates through inline styles from
 * JavaScript, so every `whileInView`, `layoutId` and `AnimatePresence` in the
 * app kept running at full amplitude for people who asked for less movement.
 *
 * `reducedMotion="user"` makes Motion follow the system setting: transform and
 * layout animations are dropped, opacity cross-fades are kept, so nothing
 * appears or disappears without warning.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
