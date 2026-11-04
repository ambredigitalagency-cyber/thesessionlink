import type { CSSProperties } from "react";

/**
 * The eight looks a public page can wear, and the coach's accent on top.
 *
 * A theme is data: colours, the shape of buttons and cards, a type family.
 * The renderer reads it through CSS variables set on the page's root, so the
 * public page and the editor's preview wear it the same way.
 *
 * The accent is free (any colour), which is exactly why it is never used
 * as-is for text: accentPalette() derives the colour that sits on the accent
 * (white or near-black, whichever reads better) and an "accent ink" darkened or
 * lightened until it reaches 4.5:1 against the theme's own background.
 */

export const THEME_IDS = [
  "classic",
  "minimal",
  "pastel",
  "editorial",
  "sunset",
  "midnight",
  "noir",
  "bold",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type PageTheme = {
  id: ThemeId;
  dark: boolean;
  /** Page background: a colour or a gradient. */
  background: string;
  /** The colour contrast checks run against (the darkest/lightest of the background). */
  base: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
  font: "sans" | "serif" | "rounded" | "mono";
  /** Buttons and cards share a corner language. */
  radius: string;
  /** Link buttons: a raised card, a drawn outline, the accent itself, or a hard shadow. */
  buttons: "card" | "outline" | "accent" | "brutal";
  /** Content cards (text, FAQ, hours…). */
  cards: "flat" | "shadow" | "outline" | "glass" | "brutal";
};

export const THEMES: Record<ThemeId, PageTheme> = {
  classic: {
    id: "classic",
    dark: false,
    background: "#faf9f7",
    base: "#faf9f7",
    text: "#141416",
    muted: "#5e5e66",
    surface: "#ffffff",
    border: "rgb(20 20 22 / 0.09)",
    font: "sans",
    radius: "16px",
    buttons: "card",
    cards: "shadow",
  },
  minimal: {
    id: "minimal",
    dark: false,
    background: "#ffffff",
    base: "#ffffff",
    text: "#111111",
    muted: "#6b6b6b",
    surface: "#ffffff",
    border: "rgb(0 0 0 / 0.14)",
    font: "sans",
    radius: "6px",
    buttons: "outline",
    cards: "outline",
  },
  pastel: {
    id: "pastel",
    dark: false,
    background: "linear-gradient(160deg, #fdf2f8 0%, #eef2ff 55%, #ecfeff 100%)",
    base: "#f1f0fb",
    text: "#2b2440",
    muted: "#6a6283",
    surface: "rgb(255 255 255 / 0.78)",
    border: "rgb(43 36 64 / 0.08)",
    font: "rounded",
    radius: "999px",
    buttons: "card",
    cards: "glass",
  },
  editorial: {
    id: "editorial",
    dark: false,
    background: "#f4efe6",
    base: "#f4efe6",
    text: "#231f1a",
    muted: "#6e6457",
    surface: "#fbf8f2",
    border: "rgb(35 31 26 / 0.16)",
    font: "serif",
    radius: "2px",
    buttons: "outline",
    cards: "flat",
  },
  sunset: {
    id: "sunset",
    dark: false,
    background:
      "linear-gradient(180deg, color-mix(in oklab, var(--accent) 22%, #fff7ed) 0%, #fffaf5 60%)",
    base: "#fff7ef",
    text: "#2a1d14",
    muted: "#6f5a4b",
    surface: "#ffffff",
    border: "rgb(42 29 20 / 0.08)",
    font: "sans",
    radius: "22px",
    buttons: "accent",
    cards: "shadow",
  },
  midnight: {
    id: "midnight",
    dark: true,
    background: "radial-gradient(120% 80% at 50% 0%, #1d2547 0%, #0b0f1f 60%)",
    base: "#0f1427",
    text: "#eef1fb",
    muted: "#a3abc6",
    surface: "rgb(255 255 255 / 0.06)",
    border: "rgb(255 255 255 / 0.1)",
    font: "sans",
    radius: "18px",
    buttons: "card",
    cards: "glass",
  },
  noir: {
    id: "noir",
    dark: true,
    background: "#0a0a0a",
    base: "#0a0a0a",
    text: "#fafafa",
    muted: "#a1a1a1",
    surface: "#141414",
    border: "rgb(255 255 255 / 0.14)",
    font: "mono",
    radius: "0px",
    buttons: "outline",
    cards: "outline",
  },
  bold: {
    id: "bold",
    dark: false,
    background: "#fff4d6",
    base: "#fff4d6",
    text: "#111111",
    muted: "#3f3a2c",
    surface: "#ffffff",
    border: "#111111",
    font: "sans",
    radius: "12px",
    buttons: "brutal",
    cards: "brutal",
  },
};

export function getTheme(id: string | null | undefined): PageTheme {
  return THEMES[(THEME_IDS as readonly string[]).includes(id ?? "") ? (id as ThemeId) : "classic"];
}

/** Ready-made accents for the picker; any other colour is allowed. */
export const ACCENT_PRESETS = [
  "#f2542d",
  "#e11d48",
  "#db2777",
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#1f7a55",
  "#65a30d",
  "#b45309",
  "#0c0c0d",
] as const;

export const DEFAULT_ACCENT = "#f2542d";

/* -------------------------------------------------------------------------- */
/* Colour maths                                                                */
/* -------------------------------------------------------------------------- */

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${[...hex.slice(1)].map((c) => c + c).join("")}`;
  return null;
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function mix(a: string, b: string, weight: number): string {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  return toHex([ra + (rb - ra) * weight, ga + (gb - ga) * weight, ba + (bb - ba) * weight]);
}

/**
 * Moves `color` toward `target` until it reaches `ratio` against `against`.
 * Ten-percent steps are plenty: the result only has to be readable.
 */
function untilReadable(color: string, against: string, target: string, ratio: number): string {
  let current = color;
  for (let step = 1; step <= 10 && contrast(current, against) < ratio; step++) {
    current = mix(color, target, step / 10);
  }
  return current;
}

export type AccentPalette = {
  accent: string;
  /** Text and icons on a solid accent fill. */
  on: string;
  /** The accent as text on the page background: at least 4.5:1. */
  ink: string;
  /** A light (or dark) wash of the accent for soft surfaces. */
  soft: string;
  hover: string;
};

export function accentPalette(rawAccent: string, theme: PageTheme): AccentPalette {
  const accent = normalizeHex(rawAccent) ?? DEFAULT_ACCENT;
  const on = contrast(accent, "#ffffff") >= contrast(accent, "#111111") ? "#ffffff" : "#111111";
  const ink = untilReadable(accent, theme.base, theme.dark ? "#ffffff" : "#000000", 4.5);
  const soft = theme.dark ? mix(theme.base, accent, 0.22) : mix("#ffffff", accent, 0.12);
  const hover = mix(accent, on === "#ffffff" ? "#000000" : "#ffffff", 0.12);
  return { accent, on, ink, soft, hover };
}

const FONTS: Record<PageTheme["font"], string> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "var(--font-display), 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Nunito', var(--font-geist-sans), system-ui, sans-serif",
  mono: "var(--font-geist-mono), ui-monospace, 'SFMono-Regular', Menlo, monospace",
};

/** The CSS variables the renderer reads, set once on the page's root. */
export function themeStyle(theme: PageTheme, accent: AccentPalette): CSSProperties {
  return {
    "--page-bg": theme.background,
    "--page-base": theme.base,
    "--page-text": theme.text,
    "--page-muted": theme.muted,
    "--page-surface": theme.surface,
    "--page-border": theme.border,
    "--page-radius": theme.radius,
    "--page-font": FONTS[theme.font],
    "--accent": accent.accent,
    "--accent-on": accent.on,
    "--accent-ink": accent.ink,
    "--accent-soft": accent.soft,
    "--accent-hover": accent.hover,
    // The app's own tokens, re-pointed at the theme, so shared pieces (prices,
    // offer details, form fields) wear the page's colours without knowing it.
    "--color-ink": theme.text,
    "--color-ink-muted": theme.muted,
    "--color-ink-subtle": theme.muted,
    "--color-line": theme.border,
    "--color-line-strong": theme.border,
    "--color-surface": theme.surface,
    "--color-canvas": theme.base,
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}
