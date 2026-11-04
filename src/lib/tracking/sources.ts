/**
 * Where a visit comes from, decided once on the server for every event.
 *
 * In order of trust:
 *   1. ?src= on the page link — a tracking link or QR the coach made (any slug
 *      [a-z0-9-], 30 characters at most; anything else is ignored);
 *   2. the referrer, classified (instagram.com → instagram);
 *   3. the in-app browser, for apps that open links without a referrer
 *      (Instagram, Facebook, TikTok, LinkedIn, Snapchat say so in their
 *      user-agent);
 *   4. otherwise "direct": typed, bookmarked, from a message app, or unknown.
 *
 * The mappings live here and nowhere else.
 */

export const SOURCE_SLUG = /^[a-z0-9-]{1,30}$/;

/** A ?src= value as stored, or null when it is not a slug. */
export function parseSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return SOURCE_SLUG.test(value) ? value : null;
}

/** Sources the product knows how to name and draw. Others show their slug. */
export const KNOWN_SOURCES = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "google",
  "whatsapp",
  "linkedin",
  "x",
  "snapchat",
  "web",
  "direct",
] as const;
export type KnownSource = (typeof KNOWN_SOURCES)[number];

/** Referrer hosts, matched on the registrable end of the host name. */
const REFERRERS: [RegExp, KnownSource][] = [
  [/(^|\.)(instagram\.com|instagr\.am)$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)(tiktok\.com)$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
];

/** In-app browsers that announce themselves in the user-agent. */
const IN_APP: [RegExp, KnownSource][] = [
  [/Instagram/i, "instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/, "facebook"],
  [/BytedanceWebview|musical_ly|TikTok|trill_/i, "tiktok"],
  [/LinkedInApp/i, "linkedin"],
  [/Snapchat/i, "snapchat"],
];

export function classifyReferrer(
  referrer: string | null | undefined,
  ownHost?: string | null,
): KnownSource | null {
  if (!referrer) return null;
  let host: string;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    host = url.hostname.toLowerCase();
  } catch {
    return null;
  }
  // Moving around the page itself is not a source.
  if (ownHost && host === ownHost.toLowerCase()) return null;
  return REFERRERS.find(([pattern]) => pattern.test(host))?.[1] ?? "web";
}

export function classifyInApp(userAgent: string | null | undefined): KnownSource | null {
  if (!userAgent) return null;
  return IN_APP.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

export function resolveSource(input: {
  src?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ownHost?: string | null;
}): string {
  return (
    parseSrc(input.src) ??
    classifyReferrer(input.referrer, input.ownHost) ??
    classifyInApp(input.userAgent) ??
    "direct"
  );
}

/** The presets of "My tracking links": a kind, its default slug, and whether it is printed. */
export const SOURCE_PRESETS = [
  { kind: "instagram", slug: "instagram", printed: false },
  { kind: "tiktok", slug: "tiktok", printed: false },
  { kind: "youtube", slug: "youtube", printed: false },
  { kind: "whatsapp", slug: "whatsapp", printed: false },
  { kind: "facebook", slug: "facebook", printed: false },
  { kind: "linkedin", slug: "linkedin", printed: false },
  { kind: "flyer", slug: "qr-flyer", printed: true },
  { kind: "carte", slug: "qr-carte", printed: true },
  { kind: "vitrine", slug: "qr-vitrine", printed: true },
  { kind: "autre", slug: "", printed: false },
] as const;
export type SourceKind = (typeof SOURCE_PRESETS)[number]["kind"];

export const MAX_SOURCES = 20;
