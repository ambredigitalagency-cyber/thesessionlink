import { z } from "zod";

import { actionTypeSchema, offerFieldsSchema } from "@/lib/offers/schema";

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

export const localeSchema = z.enum(["en", "fr"]);

export const THEME_ACCENTS = ["coral", "ink", "forest", "ocean", "violet", "amber"] as const;
export type ThemeAccent = (typeof THEME_ACCENTS)[number];

export const themeSchema = z.object({
  accent: z.enum(THEME_ACCENTS).default("coral"),
});

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
  theme: themeSchema.default({ accent: "coral" }),
  calendar_visible: z.boolean().default(true),
  custom_closed_message: optionalText(500),
});

export const contactChannelsSchema = z.object({
  email: z.boolean().default(true),
  phone: z.boolean().default(false),
  whatsapp: z.boolean().default(true),
});

export const settingsSchema = z.object({
  contact_email: z
    .email("invalid_email")
    .max(160)
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone_number: phoneSchema,
  whatsapp_number: phoneSchema,
  contact_channels: contactChannelsSchema,
  locale: localeSchema,
  timezone: z.string().min(1).max(60),
  currency: z.string().regex(/^[A-Z]{3}$/, "invalid_currency"),
  reminder_hours_before: z.number().int().min(1).max(168),
  notify_new_bookings: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

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
  main_photo_url: optionalText(500),
  action_type: actionTypeSchema,
  action_config: z.unknown().default({}),
  custom_fields: offerFieldsSchema.default([]),
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

export const timeOffSchema = z
  .object({
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
    label: optionalText(80),
  })
  .refine((range) => range.ends_on >= range.starts_on, {
    message: "end_before_start",
    path: ["ends_on"],
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
