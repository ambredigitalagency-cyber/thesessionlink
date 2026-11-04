/**
 * The browsers built into social apps — the page that opens when a link is
 * tapped in Instagram, Facebook, Messenger, TikTok, Snapchat or LinkedIn.
 *
 * Google refuses to sign anyone in from them (error "disallowed_useragent"),
 * and many coaches arrive through exactly such a link, sent in an Instagram
 * message. The sign-in page uses this to put the email link first, set the
 * Google button aside with a word of explanation, and offer to reopen the page
 * in the phone's real browser.
 *
 * Careful by design: only the markers these apps add on purpose are matched,
 * never a guess from the rest of the string. A browser we fail to recognise
 * keeps the normal page, Google button included — which is what it had
 * before; a real browser wrongly flagged would lose Google for nothing.
 */

export type InAppApp = "instagram" | "facebook" | "messenger" | "tiktok" | "snapchat" | "linkedin";

export type InAppBrowser = { app: InAppApp; os: "ios" | "android" | "other" };

/** Order matters: Messenger carries Facebook's markers too. */
const MARKERS: [RegExp, InAppApp][] = [
  [/\bInstagram \d/, "instagram"],
  [/MessengerForiOS|MessengerLiteForiOS|Orca-Android|\bMESSENGER\b/, "messenger"],
  [/\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bFBIOS\b/, "facebook"],
  [/BytedanceWebview|\bmusical_ly_|\bTikTok \d|\btrill_\d/, "tiktok"],
  [/\bSnapchat\/\d/, "snapchat"],
  [/\bLinkedInApp\b/, "linkedin"],
];

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  const app = MARKERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (!app) return null;
  const os = /Android/i.test(userAgent)
    ? "android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "ios"
      : "other";
  return { app, os };
}

/**
 * On Android, an intent link hands the page to Chrome, and falls back to the
 * same page if Chrome is missing. Only built for an https address on a real
 * host: anything else gets no link at all rather than a broken one.
 */
export function chromeIntentUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname) return null;
  const scheme = parsed.protocol.slice(0, -1);
  const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return (
    `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(parsed.toString())};end`
  );
}
