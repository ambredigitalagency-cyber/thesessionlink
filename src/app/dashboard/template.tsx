"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Page transition for the dashboard. A `template` remounts on every navigation,
 * unlike a layout, so the enter animation replays when the pro moves between
 * Offers, Bookings, Profile and Settings — no AnimatePresence needed.
 *
 * Deliberately short and shallow: 4px of travel over 220ms reads as the page
 * settling, not as a transition to sit through. The root MotionConfig drops the
 * translate for anyone who asked for reduced motion, leaving the fade.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
