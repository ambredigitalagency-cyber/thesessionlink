import { z } from "zod";

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
  "cgu",
  "confidentialite",
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
  "mentions-legales",
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

export const settingsSchema = z.object({
  contact_email: z
    .email("invalid_email")
    .max(160)
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone_number: phoneSchema,
  whatsapp_number: whatsappSchema,
  locale: localeSchema,
  timezone: z.string().min(1).max(60),
  currency: z.string().regex(/^[A-Z]{3}$/, "invalid_currency"),
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
  is_active: z.boolean().default(true),
});

export type OfferInput = z.input<typeof offerInputSchema>;

/* -------------------------------------------------------------------------- */
/* Public requests                                                             */
/* -------------------------------------------------------------------------- */

/** A message or a quote request sent from a public offer. */
export const publicRequestSchema = z.object({
  offer_id: z.uuid(),
  client_name: z.string().trim().min(2, "too_short").max(120),
  client_email: z
    .email("invalid_email")
    .max(160)
    .transform((value) => value.toLowerCase()),
  client_phone: phoneSchema,
  message: z.string().trim().min(5, "too_short").max(3000),
  requested_date: z.iso.date().nullish(),
  budget: optionalText(60),
  locale: localeSchema.default("en"),
  /** Statistics only: the block it was sent from, the page's ?src= and referrer. */
  block_id: z.uuid().nullish(),
  src: z.string().max(60).nullish(),
  referrer: z.string().max(500).nullish(),
  /** Honeypot: humans never see this field, so anything in it is a bot. */
  company: z.string().max(200).optional(),
});

export type PublicRequestInput = z.input<typeof publicRequestSchema>;

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
