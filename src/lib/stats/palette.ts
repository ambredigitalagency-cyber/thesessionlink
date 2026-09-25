/**
 * Chart colours.
 *
 * The dashboard keeps the product's own coral rather than the pro's public
 * accent: the workspace should look the same whatever theme a profile wears,
 * and some accents are too pale to carry a 3px mark.
 *
 * The values themselves live in globals.css, as `--color-series-*`, because a
 * hue that works on a white card does not work on a dark one: #4a3aa7 is a
 * good violet on paper and a smudge on black. Naming them there lets each one
 * hold its paper value and its night value side by side, and lets the chart
 * keep asking for "series 3" without knowing which theme is on.
 *
 * Both rows were checked with the data-viz validator against the card they sit
 * on — #ffffff for the light row, #161619 for the dark one — for lightness
 * band, chroma floor, colour-vision separation and normal-vision separation.
 * Some slots sit under 3:1 contrast in both, which is why every share is
 * written next to its swatch instead of relying on colour.
 *
 * Slots are assigned in order and never cycled — past the fifth offer the tail
 * folds into "Other", in grey.
 */
export const SERIES_COLORS = [
  "var(--color-series-1)", // coral — the product's brand hue
  "var(--color-series-2)", // blue
  "var(--color-series-3)", // aqua
  "var(--color-series-4)", // yellow
  "var(--color-series-5)", // violet
] as const;

/** The folded tail: neutral, never one of the categorical hues. */
export const OTHER_COLOR = "var(--color-series-other)";

export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? OTHER_COLOR;
}
