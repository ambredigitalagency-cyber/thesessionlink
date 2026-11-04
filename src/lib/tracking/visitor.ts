import { createHmac } from "node:crypto";

/**
 * What the server derives from a request, and never stores raw.
 *
 * Server-only (node:crypto): nothing here may run in, or be trusted from, the
 * browser — country, city, device and the visitor code are all computed from
 * the request itself.
 */

/**
 * The visitor code: HMAC-SHA256 of IP, user-agent, page and the UTC day.
 * Stable within a day on one page (so a reload is not a second visit),
 * different the next day and on any other page — nobody can be followed
 * across days or across coaches, and the IP is not recoverable from it.
 */
export function visitorHash(input: {
  secret: string;
  ip: string;
  userAgent: string;
  profileId: string;
  now?: Date;
}): string {
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  return createHmac("sha256", input.secret)
    .update([input.ip, input.userAgent, input.profileId, day].join("\n"))
    .digest("hex");
}

/** Crawlers, link previews, monitors and headless browsers. */
const BOTS =
  /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp\/|telegrambot|discordbot|skypeuripreview|headlesschrome|phantomjs|lighthouse|pingdom|uptime|monitor|curl\/|wget\/|python-requests|python-urllib|node-fetch|axios\/|go-http-client|okhttp|java\/|httpclient|scrapy|ahrefs|semrush|mj12|bingpreview|yandex|baidu|duckduckbot|petalbot|applebot|gptbot|claudebot|ccbot|bytespider/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 20) return true;
  return BOTS.test(userAgent);
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** Vercel's coarse geolocation: ISO country, URL-encoded city. Nothing else is trusted. */
export function geoFrom(headers: Headers): { country: string | null; city: string | null } {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
  let city = headers.get("x-vercel-ip-city");
  if (city) {
    try {
      city = decodeURIComponent(city);
    } catch {
      city = null;
    }
  }
  return {
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    // A city name, not markup: letters, spaces, dashes, apostrophes, dots.
    city: city && /^[\p{L}\p{M} .'’-]{1,80}$/u.test(city) ? city : null,
  };
}

/** The client's IP as the platform reports it; never stored. */
export function ipFrom(headers: Headers): string {
  return (
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
