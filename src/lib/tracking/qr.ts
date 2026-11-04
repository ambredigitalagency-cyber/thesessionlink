import { THEMES, accentPalette, contrast, luminance, type ThemeId } from "@/lib/page/themes";

/**
 * A QR code in the coach's colours — when it still scans.
 *
 * Phone cameras read dark modules on a light ground best; many fail on a
 * light-on-dark or a low-contrast code. So the ground is always white, and the
 * modules are, in order: the coach's accent (darkened toward black until it
 * reads, as text on the page is), then the theme's own text colour, then plain
 * black. The first that keeps 4.5:1 on white and stays darker than it wins. A
 * printed QR that does not scan is worse than a plain one.
 */
export const QR_MIN_CONTRAST = 4.5;
const WHITE = "#ffffff";

function scans(fg: string): boolean {
  return contrast(fg, WHITE) >= QR_MIN_CONTRAST && luminance(fg) < luminance(WHITE);
}

export function qrColors(
  accent: string,
  themeId: ThemeId,
): { fg: string; bg: string; branded: boolean } {
  const onWhite = { ...THEMES.classic, base: WHITE, dark: false };
  const candidates = [accentPalette(accent, onWhite).ink, THEMES[themeId].text];
  const fg = candidates.find(scans);
  return fg
    ? { fg, bg: WHITE, branded: fg !== "#000000" }
    : { fg: "#000000", bg: WHITE, branded: false };
}

/** The page link a source shares: …/slug?src=source. */
export function trackingUrl(base: string, slug: string, source: string): string {
  const url = new URL(`/${slug}`, base);
  url.searchParams.set("src", source);
  return url.toString();
}
