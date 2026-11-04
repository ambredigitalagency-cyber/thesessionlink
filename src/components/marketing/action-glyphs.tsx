"use client";

import { motion, useReducedMotion } from "motion/react";

import type { ActionType } from "@/lib/offers/schema";

/**
 * One small animated drawing per action type.
 *
 * WHY NOT LOTTIE — the obvious tool for this was ruled out on weight. The
 * runtime alone is around 250 kB before a single animation, and each animation
 * is a JSON file on top; that is half again the landing's entire JavaScript
 * budget for a few decorative loops. What these need to show — a message
 * arriving, a quote being written — is a handful of rectangles
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

/** Shared canvas so they all line up optically at any size. */
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

/** A handset, and the call going out in rings. */
function CallGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();

  return (
    <Frame className={className}>
      <rect
        x="38"
        y="10"
        width="44"
        height="70"
        rx="10"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      <rect x="52" y="16" width="16" height="3" rx="1.5" className="fill-[var(--glyph-muted)]" />
      <motion.circle
        cx="60"
        cy="48"
        r="12"
        className="fill-[var(--glyph-accent)]"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: still ? 0 : 0.1, duration: 0.45, ease: EASE }}
        style={{ transformOrigin: "60px 48px" }}
      />
      {[0, 1].map((ring) => (
        <motion.path
          key={ring}
          d={`M${92 + ring * 9} ${34 - ring * 6} a${20 + ring * 9} ${20 + ring * 9} 0 0 1 0 ${28 + ring * 12}`}
          className="stroke-[var(--glyph-accent)]"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 - ring * 0.35 }}
          transition={{ delay: still ? 0 : 0.35 + ring * 0.15, duration: 0.45, ease: EASE }}
        />
      ))}
    </Frame>
  );
}

/** A button with a link drawn across it, and the arrow it leads to. */
function LinkGlyph({ className }: GlyphProps) {
  const still = useReducedMotion();

  return (
    <Frame className={className}>
      <rect
        x="12"
        y="26"
        width="96"
        height="36"
        rx="18"
        className="fill-[var(--glyph-surface)] stroke-[var(--glyph-line)]"
        strokeWidth="1.5"
      />
      <motion.path
        d="M34 44 h40"
        className="stroke-[var(--glyph-muted)]"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: still ? 0 : 0.1, duration: 0.5, ease: EASE }}
      />
      <motion.circle
        cx="90"
        cy="44"
        r="10"
        className="fill-[var(--glyph-accent)]"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: still ? 0 : 0.45, duration: 0.4, ease: EASE }}
        style={{ transformOrigin: "90px 44px" }}
      />
      <motion.path
        d="M86 44 h8 m-3 -3.5 l3.5 3.5 l-3.5 3.5"
        stroke="var(--glyph-hole)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: still ? 0 : 0.6, duration: 0.3 }}
      />
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */

export const ACTION_GLYPHS: Record<ActionType, (props: GlyphProps) => React.ReactElement> = {
  contact_request: MessageGlyph,
  whatsapp_direct: WhatsappGlyph,
  quote_request: QuoteGlyph,
};

/** The sign-up's main-button choice: the same family, two more drawings. */
export const PRIMARY_GLYPHS = {
  whatsapp: WhatsappGlyph,
  call: CallGlyph,
  message: MessageGlyph,
  link: LinkGlyph,
} as const;
