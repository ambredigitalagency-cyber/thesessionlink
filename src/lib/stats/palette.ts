/**
 * Chart colours.
 *
 * The dashboard keeps the product's own coral rather than the pro's public
 * accent: the workspace should look the same whatever theme a profile wears,
 * and some accents are too pale to carry a 3px mark.
 *
 * The categorical list was checked with the data-viz validator against the card
 * surface (#ffffff): lightness band, chroma floor, colour-vision separation and
 * normal-vision separation all pass. Three slots sit under 3:1 contrast, which
 * is why every share is written next to its swatch instead of relying on colour.
 * Slots are assigned in order and never cycled — past the fifth offer the tail
 * folds into "Other", in grey.
 */
export const SERIES_COLORS = [
  "#f2542d", // coral — the product's brand hue
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#4a3aa7", // violet
] as const;

/** The folded tail: neutral, never one of the categorical hues. */
export const OTHER_COLOR = "#93939c";

export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? OTHER_COLOR;
}
