import { z } from "zod";

import { addonsSchema } from "@/lib/offers/addons";
import { RECURRENCE_FREQUENCIES, SERIES_LIMITS } from "@/lib/scheduling/series";
import { offerFieldsSchema } from "@/lib/offers/fields";
import { actionTypeSchema } from "@/lib/offers/schema";

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const RESERVED_SLUGS = new Set([
  "about",
  "account",
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "booking",
  "bookings",
  "contact",
  "dashboard",
  "docs",
  "explore",
  "faq",
  "features",
  "for",
  "help",
  "home",
  "legal",
  "login",
  "logout",
  "new",
  "onboarding",
  "pricing",
  "privacy",
  "profile",
  "register",
  "root",
  "settings",
  "signin",
  "signout",
  "signup",
  "static",
  "status",
  "support",
  "terms",
  "www",
  "mail",
  "email",
  "team",
  "thesessionlink",
  "waitlist",
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "invalid_slug")
  .refine((value) => !RESERVED_SLUGS.has(value), "slug_reserved");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^\+?[0-9 ().-]{6,30}$/, "invalid_phone")
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * WhatsApp, stored in the one shape its column accepts.
 *
 * `profiles.whatsapp_number` carries a check constraint of `^\+?[0-9]{6,20}$`
 * — a leading plus and digits, nothing else — while people type "+212 6 11 22
 * 33 44", with the spaces that make a number readable. The looser phone schema
 * let that through and Postgres refused the row, which surfaced as a generic
 * "something went wrong" with no field to point at.
 *
 * So the value is normalised rather than refused: punctuation is dropped, an
 * inner plus goes with it, and what reaches the column is canonical. The
 * constraint stays the guard it was written to be, and nobody is asked to
 * delete their own spaces.
 */
const whatsappSchema = z
  .string()
  .trim()
  .max(40)
  .nullish()
  .transform((value) => {
    if (!value) return null;
    const digits = value.replace(/[^\d+]/g, "");
    const normalised = digits.startsWith("+")
      ? `+${digits.slice(1).replace(/\+/g, "")}`
      : digits.replace(/\+/g, "");
    // An answer that normalises to nothing is still an answer, and a wrong
    // one. Returning null here would quietly swallow what they typed and show
    // them a page with no WhatsApp on it and no reason why.
    return normalised === "" ? value : normalised;
  })
  .refine((value) => value === null || /^\+?[0-9]{6,20}$/.test(value), "invalid_phone");

export const localeSchema = z.enum(["en", "fr"]);

export const THEME_ACCENTS = ["coral", "ink", "forest", "ocean", "violet", "amber"] as const;
export type ThemeAccent = (typeof THEME_ACCENTS)[number];

/**
 * How the public page is laid out. "centered" is the original: everything on
 * one axis. "banner" puts an accent band behind the header and the avatar
 * astride it. "compact" sets the header to the side and the offers in two
 * columns on wide screens — for coaches with many offers.
 */
export const PROFILE_LAYOUTS = ["centered", "banner", "compact"] as const;
export type ProfileLayout = (typeof PROFILE_LAYOUTS)[number];

/** Offer cards: bordered (the original), shadowed without border, or tinted. */
export const CARD_STYLES = ["outline", "soft", "accent"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const themeSchema = z.object({
  accent: z.enum(THEME_ACCENTS).default("coral"),
  layout: z.enum(PROFILE_LAYOUTS).default("centered"),
  cards: z.enum(CARD_STYLES).default("outline"),
});

export type ProfileTheme = z.output<typeof themeSchema>;

/** Reads a stored theme, falling back to the defaults for anything missing. */
export function parseTheme(raw: unknown): ProfileTheme {
  const parsed = themeSchema.safeParse(raw && typeof raw === "object" ? raw : {});
  return parsed.success ? parsed.data : themeSchema.parse({});
}

export const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "linkedin",
  "facebook",
  "youtube",
  "x",
  "website",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const socialLinksSchema = z.partialRecord(
  z.enum(SOCIAL_KEYS),
  z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => (value ? value : null)),
);

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

/** Onboarding step 2 — the minimum needed to own a public link. */
export const profileBasicsSchema = z.object({
  display_name: z.string().trim().min(2, "too_short").max(80),
  slug: slugSchema,
  category_id: z
    .uuid()
    .nullish()
    .transform((value) => value ?? null),
});

export const profileDetailsSchema = z.object({
  display_name: z.string().trim().min(2, "too_short").max(80),
  slug: slugSchema,
  headline: optionalText(120),
  bio: optionalText(1200),
  location: optionalText(120),
  avatar_url: optionalText(500),
  category_id: z
    .uuid()
    .nullish()
    .transform((value) => value ?? null),
  social_links: socialLinksSchema.default({}),
  theme: themeSchema.default({ accent: "coral", layout: "centered", cards: "outline" }),
  calendar_visible: z.boolean().default(true),
  custom_closed_message: optionalText(500),
  custom_fields: offerFieldsSchema.default([]),
});

export const contactChannelsSchema = z.object({
  email: z.boolean().default(true),
  phone: z.boolean().default(false),
  whatsapp: z.boolean().default(true),
});

/**
 * Onboarding, the screens after the link.
 *
 * Every field is optional and every screen can be skipped: only the name and
 * the link make a profile. It is a patch rather than the whole profile, so a
 * screen saves what it collected without having to resend — or overwrite —
 * what the screens before it collected.
 */
export const onboardingProfileSchema = z.object({
  avatar_url: optionalText(500).optional(),
  bio: optionalText(1200).optional(),
  location: optionalText(120).optional(),
  phone_number: phoneSchema.optional(),
  whatsapp_number: whatsappSchema.optional(),
  social_links: socialLinksSchema.optional(),
  custom_fields: offerFieldsSchema.optional(),
});

export const settingsSchema = z.object({
  contact_email: z
    .email("invalid_email")
    .max(160)
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone_number: phoneSchema,
  whatsapp_number: whatsappSchema,
  contact_channels: contactChannelsSchema,
  locale: localeSchema,
  timezone: z.string().min(1).max(60),
  currency: z.string().regex(/^[A-Z]{3}$/, "invalid_currency"),
  reminder_hours_before: z.number().int().min(1).max(168),
  reminder_message: optionalText(500),
  notify_new_bookings: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

/** Hard ceiling, whatever the plan allows — keeps a payload from ballooning. */
export const ABSOLUTE_MAX_PHOTOS = 20;

export const offerInputSchema = z.object({
  title: z.string().trim().min(2, "too_short").max(120),
  description: optionalText(5000),
  price: z
    .number()
    .min(0)
    .max(9_999_999)
    .nullish()
    .transform((value) => (value === undefined ? null : value)),
  price_type: z.enum(["fixed", "from", "free", "on_request"]).default("fixed"),
  // Ordered; the first entry is the main photo. main_photo_url is derived from
  // photos[0] by a database trigger, so it is never accepted from the client. The per-plan cap is applied in
  // the server action, which is the only place that knows the pro's plan.
  photos: z.array(z.string().trim().min(1).max(500)).max(ABSOLUTE_MAX_PHOTOS).default([]),
  action_type: actionTypeSchema,
  action_config: z.unknown().default({}),
  custom_fields: offerFieldsSchema.default([]),
  addons: addonsSchema,
  is_active: z.boolean().default(true),
});

export type OfferInput = z.input<typeof offerInputSchema>;

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

const timeSchema = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d(:[0-5]\d)?$/, "invalid_time");

export const availabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((rule) => rule.end_time > rule.start_time, {
    message: "end_before_start",
    path: ["end_time"],
  });

export const weeklyScheduleSchema = z.object({
  offer_id: z
    .uuid()
    .nullish()
    .transform((value) => value ?? null),
  rules: z.array(availabilityRuleSchema).max(60),
});

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalid_time")
  .nullish()
  .transform((value) => value ?? null);

/** A whole-day block, or — with both times — only those hours on each day. */
export const timeOffSchema = z
  .object({
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
    start_time: clockTime,
    end_time: clockTime,
    label: optionalText(80),
  })
  .refine((range) => range.ends_on >= range.starts_on, {
    message: "end_before_start",
    path: ["ends_on"],
  })
  .refine((range) => (range.start_time === null) === (range.end_time === null), {
    message: "invalid_time",
    path: ["end_time"],
  })
  .refine((range) => !range.start_time || !range.end_time || range.end_time > range.start_time, {
    message: "end_before_start",
    path: ["end_time"],
  });

/* -------------------------------------------------------------------------- */
/* Public booking                                                              */
/* -------------------------------------------------------------------------- */

export const publicBookingSchema = z.object({
  offer_id: z.uuid(),
  client_name: z.string().trim().min(2, "too_short").max(120),
  client_email: z
    .email("invalid_email")
    .max(160)
    .transform((value) => value.toLowerCase()),
  client_phone: phoneSchema,
  message: optionalText(3000),
  /** ISO instant for calendar_booking offers. */
  start: z.iso.datetime({ offset: true }).nullish(),
  requested_date: z.iso.date().nullish(),
  quantity: z.number().int().min(1).max(50).default(1),
  budget: optionalText(60),
  client_timezone: optionalText(60),
  locale: localeSchema.default("en"),
  /**
   * How the client chose to pay, on an offer that offers the choice.
   *
   * "on_site" is a real answer, not the absence of one: it says the client saw
   * the payment step and chose to settle with the coach in person.
   */
  payment_choice: z.enum(["stripe", "paypal", "on_site"]).nullish(),
  /** A recurring series, on calendar offers that allow it. */
  recurrence: z
    .object({
      frequency: z.enum(RECURRENCE_FREQUENCIES),
      count: z.number().int().min(SERIES_LIMITS.min).max(SERIES_LIMITS.max),
    })
    .nullish(),
  /** Ids of the offer's add-ons the client ticked; resolved on the server. */
  addons: z.array(z.string().max(40)).max(6).default([]),
  /** Honeypot: humans never see this field, so anything in it is a bot. */
  company: z.string().max(200).optional(),
});

export type PublicBookingInput = z.input<typeof publicBookingSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Flattens zod issues into `{ field: messageKey }` for inline form errors. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}
