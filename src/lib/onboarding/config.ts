import type { ThemeId } from "@/lib/page/themes";

/**
 * What the sign-up adapts to the coach's trade, in one place.
 *
 * Keyed by activity_categories.slug; a trade missing here gets the general
 * entry. Nothing in it ever reaches a public page unless the coach keeps it:
 * the theme is a starting point they confirm on the appearance screen, the
 * WhatsApp message is shown in the field for them to edit, and the words only
 * build alternative links they choose from.
 */

/** The theme preselected on the appearance screen. */
export const CATEGORY_THEMES: Record<string, ThemeId> = {
  "fitness-coach": "bold",
  "life-coach": "minimal",
  "real-estate": "editorial",
  hairdresser: "noir",
  beauty: "pastel",
  wellness: "pastel",
  "music-teacher": "sunset",
  tutor: "classic",
  photographer: "noir",
  therapist: "minimal",
  consultant: "editorial",
  rental: "classic",
  "content-creator": "sunset",
};

export const DEFAULT_THEME: ThemeId = "classic";

export function themeForCategory(slug: string | null | undefined): ThemeId {
  return CATEGORY_THEMES[slug ?? ""] ?? DEFAULT_THEME;
}

type Localized = { fr: string; en: string };

/**
 * The message a visitor's WhatsApp opens with — what the coach would like to
 * receive. Written as the visitor, plainly, without promising anything on the
 * coach's behalf.
 */
const WHATSAPP_MESSAGES: Record<string, Localized> = {
  "fitness-coach": {
    fr: "Bonjour, j’ai vu votre page. Je voudrais des informations sur vos séances de coaching.",
    en: "Hello, I saw your page. I’d like some information about your coaching sessions.",
  },
  "life-coach": {
    fr: "Bonjour, j’ai vu votre page. J’aimerais en savoir plus sur votre accompagnement.",
    en: "Hello, I saw your page. I’d like to know more about how you work with clients.",
  },
  "real-estate": {
    fr: "Bonjour, j’ai vu votre page. Je cherche des informations sur un bien.",
    en: "Hello, I saw your page. I’m looking for information about a property.",
  },
  hairdresser: {
    fr: "Bonjour, j’ai vu votre page. Je voudrais prendre rendez-vous.",
    en: "Hello, I saw your page. I’d like to book an appointment.",
  },
  beauty: {
    fr: "Bonjour, j’ai vu votre page. Je voudrais prendre rendez-vous.",
    en: "Hello, I saw your page. I’d like to book an appointment.",
  },
  wellness: {
    fr: "Bonjour, j’ai vu votre page. Je voudrais des informations sur vos soins.",
    en: "Hello, I saw your page. I’d like some information about your treatments.",
  },
  "music-teacher": {
    fr: "Bonjour, j’ai vu votre page. Je voudrais des informations sur vos cours.",
    en: "Hello, I saw your page. I’d like some information about your lessons.",
  },
  tutor: {
    fr: "Bonjour, j’ai vu votre page. Je voudrais des informations sur vos cours.",
    en: "Hello, I saw your page. I’d like some information about your lessons.",
  },
  photographer: {
    fr: "Bonjour, j’ai vu votre page. J’ai un projet photo dont j’aimerais vous parler.",
    en: "Hello, I saw your page. I have a photo project I’d like to tell you about.",
  },
  therapist: {
    fr: "Bonjour, j’ai vu votre page. J’aimerais en savoir plus sur votre accompagnement.",
    en: "Hello, I saw your page. I’d like to know more about how you work.",
  },
  consultant: {
    fr: "Bonjour, j’ai vu votre page. J’ai un projet dont j’aimerais vous parler.",
    en: "Hello, I saw your page. I have a project I’d like to discuss with you.",
  },
  rental: {
    fr: "Bonjour, j’ai vu votre page. Je voudrais connaître vos disponibilités.",
    en: "Hello, I saw your page. I’d like to know when it’s available.",
  },
  "content-creator": {
    fr: "Bonjour, je vous écris depuis votre page. J’ai une proposition de collaboration.",
    en: "Hello, I’m writing from your page. I have a collaboration proposal.",
  },
};

const GENERAL_MESSAGE: Localized = {
  fr: "Bonjour, j’ai vu votre page et j’aimerais avoir des informations.",
  en: "Hello, I saw your page and I’d like some information.",
};

export function whatsappMessageFor(slug: string | null | undefined, locale: string): string {
  const entry = WHATSAPP_MESSAGES[slug ?? ""] ?? GENERAL_MESSAGE;
  return locale === "fr" ? entry.fr : entry.en;
}

/** A word of the trade, for alternative links: sara-coach, coach-sara. */
const SLUG_WORDS: Record<string, Localized> = {
  "fitness-coach": { fr: "coach", en: "coach" },
  "life-coach": { fr: "coaching", en: "coaching" },
  "real-estate": { fr: "immo", en: "homes" },
  hairdresser: { fr: "coiffure", en: "hair" },
  beauty: { fr: "beaute", en: "beauty" },
  wellness: { fr: "bienetre", en: "wellness" },
  "music-teacher": { fr: "musique", en: "music" },
  tutor: { fr: "cours", en: "tutor" },
  photographer: { fr: "photo", en: "photo" },
  therapist: { fr: "therapie", en: "therapy" },
  consultant: { fr: "conseil", en: "consulting" },
  rental: { fr: "location", en: "rental" },
  "content-creator": { fr: "officiel", en: "official" },
};

export function slugWordFor(slug: string | null | undefined, locale: string): string {
  const entry = SLUG_WORDS[slug ?? ""] ?? { fr: "pro", en: "pro" };
  return locale === "fr" ? entry.fr : entry.en;
}

/**
 * Dialling codes offered for the phone field, Morocco first: most coaches
 * arriving today are there. The rest are the countries they and their
 * clients most often call from; anything else can be typed with its +code.
 */
export const COUNTRIES = [
  { code: "MA", dial: "212" },
  { code: "FR", dial: "33" },
  { code: "BE", dial: "32" },
  { code: "CH", dial: "41" },
  { code: "CA", dial: "1" },
  { code: "LU", dial: "352" },
  { code: "DZ", dial: "213" },
  { code: "TN", dial: "216" },
  { code: "SN", dial: "221" },
  { code: "CI", dial: "225" },
  { code: "ES", dial: "34" },
  { code: "GB", dial: "44" },
  { code: "US", dial: "1" },
  { code: "AE", dial: "971" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const DEFAULT_COUNTRY: CountryCode = "MA";
