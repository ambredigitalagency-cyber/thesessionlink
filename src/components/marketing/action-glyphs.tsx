"use client";

import { motion, useReducedMotion } from "motion/react";

import type { ActionType } from "@/lib/offers/schema";

/**
 * One small animated drawing per action type.
 *
 * WHY NOT LOTTIE — the obvious tool for this was ruled out on weight. The
 * runtime alone is around 250 kB before a single animation, and each animation
 * is a JSON file on top; that is half again the landing's entire JavaScript
 * budget for five decorative loops. What these need to show — a slot being
 * picked, a seat being taken, a message arriving — is a handful of rectangles
 * and a line, which is exactly what this design system is already made of.
 * Motion is already a dependency and animates SVG attributes for free, so each
 * glyph here costs a few hundred bytes of markup and nothing else.
 *
 * They are decoration, not information: every one is aria-hidden, and the
 * meaning always sits in the text beside them. Under reduced motion they land
 * on their finished state at once and stay there.
 *
 * "At once" rather than "from the start": the from-state is the same in every
 * render, and only the delays and durations are zeroed. Deciding in JavaScript
 * whether a piece starts scaled down means the server writes one transform and
 * the browser hydrates another, which React reports as a hydration mismatch —
 * for the readers who asked for less movement, and nobody else. The preference
 * belongs in the transition, never in `initial`.
 *
 * Colour comes from three custom properties rather than the accent directly,
 * so the same drawing works on paper and on the dark band: a consumer on a
 * dark surface redefines them once on a wrapper and nothing else changes.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type GlyphProps = { className?: string };

/** Shared canvas so the five line up optically at any size. */
function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 88"
      fill="none"
      aria-hidden
      className={className}
      style={
        {
          overflow: "visible",
          "--glyph-surface": "var(--glyph-surface-override, var(--accent-soft))",
          "--glyph-line":
            "var(--glyph-line-override, color-mix(in oklab, var(--accent) 28%, transparent))",
          "--glyph-muted":
            "var(--glyph-muted-override, color-mix(in oklab, var(--accent) 22%, transparent))",
          "--glyph-accent": "var(--glyph-accent-override, var(--accent))",
          // What a cut-out reveals: whatever surface the glyph is sitting on.
          "--glyph-hole": "var(--glyph-hole-override, var(--color-canvas))",
        } as React.CSSProperties
      }
    >
      {children}
    </svg>
  );
}

/** Set on any wrapper sitting on the dark band. */
export const GLYPH_ON_DARK = {
  "--glyph-surface-override": "rgb(255 255 255 / 0.08)",
  "--glyph-line-override": "rgb(255 255 255 / 0.26)",
  "--glyph-muted-override": "rgb(255 255 255 / 0.24)",
  "--glyph-accent-override": "var(--accent)",
  "--glyph-hole-override": "var(--color-night-soft)",
} as React.CSSProperties;

/* -------------------------------------------------------------------------- */

/** A week of slots; one fills in and is ticked. */
function CalendarGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();
  const slots = Array.from({ length: 12 }, (_, i) => i);

  return (
    <Frame className={className}>
      <rect
        x="8"
        y="10"
        width="104"
        height="70"
        rx="10"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      <rect x="8" y="10" width="104" height="14" rx="10" className="fill-[var(--glyph-muted)]" />

      {slots.map((index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const chosen = index === 6;

        return (
          <motion.rect
            key={index}
            x={18 + column * 23}
            y={32 + row * 16}
            width="17"
            height="10"
            rx="3"
            className={chosen ? "fill-[var(--glyph-accent)]" : "fill-[var(--glyph-muted)]"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: still ? 0 : 0.2 + index * 0.04, duration: 0.4, ease: EASE }}
            style={{ transformOrigin: `${26 + column * 23}px ${37 + row * 16}px` }}
          />
        );
      })}

      {/* The tick lands last: the moment the slot becomes a booking. */}
      <motion.path
        d="M56 51.5 L59.5 55 L67 47"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: still ? 0 : 0.85, duration: 0.45, ease: "easeOut" }}
      />
    </Frame>
  );
}

/** Seats in a row; one is taken and the counter drops. */
function TicketGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();

  return (
    <Frame className={className}>
      <rect
        x="8"
        y="18"
        width="104"
        height="52"
        rx="10"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      {/* The notch that makes it read as a ticket. */}
      <circle cx="78" cy="18" r="6" className="fill-[var(--glyph-hole)]" />
      <circle cx="78" cy="70" r="6" className="fill-[var(--glyph-hole)]" />
      <path
        d="M78 26 v36"
        className="stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />

      {[0, 1, 2, 3].map((seat) => (
        <motion.rect
          key={seat}
          x={18 + seat * 14}
          y="36"
          width="10"
          height="16"
          rx="3"
          className={seat === 1 ? "fill-[var(--glyph-accent)]" : "fill-[var(--glyph-muted)]"}
          // `y` here is a transform, not the attribute: it has to end at 0 or
          // the seat lands a whole rect-height below where it was drawn.
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: still ? 0 : 0.15 + seat * 0.08, duration: 0.45, ease: EASE }}
        />
      ))}

      <motion.rect
        x="86"
        y="38"
        width="18"
        height="12"
        rx="4"
        className="fill-[var(--glyph-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: still ? 0 : 0.5, duration: 0.4 }}
      />
    </Frame>
  );
}

/** A message being typed, then sent. */
function MessageGlyph({ className }: GlyphProps) {
  return (
    <Frame className={className}>
      <path
        d="M14 16 h92 a8 8 0 0 1 8 8 v30 a8 8 0 0 1 -8 8 h-58 l-16 12 v-12 h-18 a8 8 0 0 1 -8 -8 v-30 a8 8 0 0 1 8 -8 z"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      {/*
       * The only loop in the set, so the only one that has to stop outright
       * rather than reach its end — hence CSS. It also keeps the dots at one
       * opacity in the HTML for every reader, which a JavaScript branch on the
       * preference could not do without disagreeing with the server.
       */}
      {[0, 1, 2].map((dot) => (
        <circle
          key={dot}
          cx={44 + dot * 16}
          cy="39"
          r="5"
          opacity={0.8}
          className="glyph-pulse fill-[var(--glyph-accent)]"
          style={{ "--pulse-delay": `${dot * 0.18}s` } as React.CSSProperties}
        />
      ))}
    </Frame>
  );
}

/** Two bubbles meeting: the conversation that opens in one tap. */
function WhatsappGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();

  return (
    <Frame className={className}>
      <motion.path
        d="M10 18 h54 a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h-38 l-12 9 v-9 h-4 a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8 z"
        className="fill-[var(--glyph-muted)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      />
      <motion.path
        d="M110 40 h-42 a8 8 0 0 0 -8 8 v14 a8 8 0 0 0 8 8 h30 l12 8 v-8 a8 8 0 0 0 8 -8 v-14 a8 8 0 0 0 -8 -8 z"
        className="fill-[var(--glyph-accent)] stroke-[var(--glyph-accent)]"
        strokeWidth="1.5"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: still ? 0 : 0.22, duration: 0.5, ease: EASE }}
      />
    </Frame>
  );
}

/** A brief, then a price written on it. */
function QuoteGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();

  return (
    <Frame className={className}>
      <rect
        x="20"
        y="8"
        width="80"
        height="72"
        rx="9"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      {[0, 1, 2].map((line) => (
        <motion.path
          key={line}
          d={`M32 ${26 + line * 13} h${line === 2 ? 30 : 56}`}
          className="stroke-[var(--glyph-muted)]"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: still ? 0 : 0.15 + line * 0.12, duration: 0.5, ease: EASE }}
        />
      ))}

      <motion.rect
        x="32"
        y="58"
        width="40"
        height="14"
        rx="7"
        className="fill-[var(--glyph-accent)]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: still ? 0 : 0.6, duration: 0.45, ease: EASE }}
        style={{ transformOrigin: "52px 65px" }}
      />
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */

export const ACTION_GLYPHS: Record<ActionType, (props: GlyphProps) => React.ReactElement> = {
  calendar_booking: CalendarGlyph,
  direct_reservation: TicketGlyph,
  contact_request: MessageGlyph,
  whatsapp_direct: WhatsappGlyph,
  quote_request: QuoteGlyph,
};
