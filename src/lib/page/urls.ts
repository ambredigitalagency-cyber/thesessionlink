/**
 * Everything a page block does with a URL: decide whether it may be followed
 * at all, recognise which platform it points to, and build the few URLs the
 * blocks write themselves (WhatsApp, maps, the YouTube embed).
 *
 * Pure and shared: the editor uses it to answer as the coach types, the server
 * revalidates with it, and the public page renders with it.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * The URL to put in an href, or null when it must not be one.
 *
 * Only http(s), mailto and tel are followed; javascript:, data:, file: and
 * anything else are refused, whatever their case or the spaces around them.
 * A bare domain ("monsite.fr") is read as https.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Control characters inside a scheme are a classic way past naive checks
  // ("java\tscript:"); the URL parser strips them, so do we, before deciding.
  const value = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!value || value.length > 2000) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const candidate = hasScheme ? value : `https://${value.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
  if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".")) {
    return null;
  }
  return url.toString();
}

/** True for http(s) links, which open in a new tab with noopener/noreferrer. */
export function isExternal(href: string): boolean {
  return /^https?:/i.test(href);
}

export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "x",
  "snapchat",
  "telegram",
  "whatsapp",
  "pinterest",
  "threads",
  "twitch",
  "spotify",
  "github",
  "email",
  "phone",
  "website",
] as const;
export type Platform = (typeof PLATFORMS)[number];

const HOSTS: [RegExp, Platform][] = [
  [/(^|\.)instagram\.com$|(^|\.)instagr\.am$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/, "youtube"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, "facebook"],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)t\.me$|(^|\.)telegram\.(me|org)$/, "telegram"],
  [/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/, "whatsapp"],
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, "pinterest"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/(^|\.)github\.com$/, "github"],
];

/** Which platform a URL points to; "website" for anything else. */
export function detectPlatform(raw: string | null | undefined): Platform {
  const href = safeUrl(raw);
  if (!href) return "website";
  const url = new URL(href);
  if (url.protocol === "mailto:") return "email";
  if (url.protocol === "tel:") return "phone";
  const host = url.hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/^m\./, "");
  return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? "website";
}

/** "instagram.com/atelier" → a readable default title for a link. */
export function linkLabel(raw: string | null | undefined): string {
  const href = safeUrl(raw);
  if (!href) return "";
  const url = new URL(href);
  if (url.protocol === "mailto:") return url.pathname;
  if (url.protocol === "tel:") return url.pathname;
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.hostname.replace(/^www\./, "")}${path.length > 1 ? path : ""}`;
}

/**
 * The 11-character id of a YouTube video, from any of the shapes people
 * paste: watch?v=, youtu.be/, shorts/, embed/, live/, or the id alone.
 */
export function youtubeId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  const href = safeUrl(value);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      id = match?.[2] ?? null;
    }
  }

  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** The only player the page embeds: the privacy-enhanced one. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** A search on Google Maps — a link, never an embedded map. */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/** Digits only, with the leading + WhatsApp expects dropped. */
export function whatsappUrl(number: string, message?: string | null): string {
  const digits = number.replace(/[^\d]/g, "");
  const text = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function telUrl(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}

export function mailtoUrl(email: string): string {
  return `mailto:${email.trim()}`;
}
