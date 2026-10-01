import type { Locale } from "@/lib/i18n/config";

/**
 * The three legal pages. Each exists once per language, at its own URL: the
 * URL decides the language of the text, not the locale cookie, so a link to
 * /cgu sent to someone who has never visited the site still opens in French.
 */
export const LEGAL_DOCUMENTS = ["notice", "terms", "privacy"] as const;

export type LegalDocumentKey = (typeof LEGAL_DOCUMENTS)[number];

export const LEGAL_PATHS: Record<LegalDocumentKey, Record<Locale, string>> = {
  notice: { fr: "/mentions-legales", en: "/legal" },
  terms: { fr: "/cgu", en: "/terms" },
  privacy: { fr: "/confidentialite", en: "/privacy" },
};

/** The language a legal page's URL fixes, or null for any other path. */
export function legalPathLocale(pathname: string): Locale | null {
  for (const paths of Object.values(LEGAL_PATHS)) {
    for (const [locale, path] of Object.entries(paths) as [Locale, string][]) {
      if (pathname === path) return locale;
    }
  }
  return null;
}

/**
 * A paragraph, or a bulleted list. Anything in [SQUARE BRACKETS] is a
 * placeholder the owner still has to fill in: the page highlights it, so a
 * forgotten one shows instead of passing for real text.
 */
export type LegalBlock = string | { list: string[] };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  title: string;
  /** One line under the title: what this page is for. */
  summary: string;
  /** Shown as "last updated"; a placeholder until the text is final. */
  updated: string;
  sections: LegalSection[];
};
