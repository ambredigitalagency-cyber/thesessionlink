/**
 * Light, dark, or whatever the device says.
 *
 * The choice lives in a plain cookie rather than on the profile, because it is
 * a property of the screen you are reading on and not of the business you run:
 * the same coach on a phone at night and a laptop at noon wants two different
 * answers, and a client opening a public page has no profile at all.
 *
 * A cookie rather than localStorage for one reason that matters more than
 * taste: the server can read it. `<html data-theme>` is therefore correct in
 * the first byte of the response, which is what removes the flash of the wrong
 * theme without an inline script running before paint.
 */

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "theme";

/** A year: long enough that nobody is asked twice, short enough to lapse. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseTheme(value: string | undefined | null): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "system";
}

/**
 * The colour behind the browser chrome — the status bar on iOS, the address
 * bar on Android. "system" hands the decision to the platform through a pair
 * of media-scoped values; a forced theme names one colour, because the reader
 * asked for that theme regardless of what their OS thinks.
 */
export const THEME_COLORS = { light: "#fbfaf9", dark: "#0d0d0f" } as const;
