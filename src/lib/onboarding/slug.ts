import { slugify } from "@/lib/utils";
import { RESERVED_SLUGS } from "@/lib/validation";

/**
 * Links, as the name-and-link screen proposes them.
 *
 * The status shown under the field is one of four, worked out here for the
 * shape and by the database for the rest: a link can be malformed (invalid),
 * a word the site uses itself (reserved), someone else's (taken) or free.
 */

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const SLUG_MAX = 40;

export type SlugStatus = "free" | "taken" | "reserved" | "invalid";

/** The shape check, before anything is asked of the server. */
export function slugShape(slug: string): "ok" | "invalid" | "reserved" {
  if (!SLUG_PATTERN.test(slug)) return "invalid";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return "ok";
}

/** The link a name suggests: "Sara El Amrani" → "sara-el-amrani". */
export function slugFromName(name: string): string {
  return slugify(name).slice(0, SLUG_MAX).replace(/-+$/, "");
}

/**
 * Candidates for a link that is not available, best first: the trade's word
 * after then before the name, then numbers. All well-formed and not reserved;
 * which of them are free is the database's answer.
 */
export function slugCandidates(base: string, word: string): string[] {
  const clean =
    slugify(base)
      .slice(0, SLUG_MAX - 10)
      .replace(/-+$/, "") || "page";
  const trade = slugify(word);
  const candidates = [
    trade ? `${clean}-${trade}` : null,
    trade ? `${trade}-${clean}` : null,
    ...Array.from({ length: 8 }, (_, index) => `${clean}-${index + 2}`),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)].filter(
    (candidate) => candidate !== base && slugShape(candidate) === "ok",
  );
}

/**
 * Where "Choose your link" on the landing leads: the sign-up, carrying the
 * link through to the name-and-link screen — in the URL, so it survives the
 * email link being opened in another browser.
 */
export function claimHref(slug: string): string {
  const next = `/onboarding?slug=${encodeURIComponent(slug)}`;
  return `/login?intent=signup&next=${encodeURIComponent(next)}`;
}

/** The link carried by ?slug=, when it is one a coach could have. */
export function slugFromParam(value: unknown): string | null {
  return typeof value === "string" && slugShape(value) === "ok" ? value : null;
}
