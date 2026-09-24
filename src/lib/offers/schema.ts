import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Action types                                                                */
/* -------------------------------------------------------------------------- */

export const ACTION_TYPES = [
  "calendar_booking",
  "direct_reservation",
  "contact_request",
  "whatsapp_direct",
  "quote_request",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const actionTypeSchema = z.enum(ACTION_TYPES);

const askPhoneSchema = z.enum(["hidden", "optional", "required"]);
export type AskPhone = z.infer<typeof askPhoneSchema>;

/**
 * Online payment, on the two action types that are a transaction.
 *
 * "off"      — nothing changes; the client books and pays the coach as before.
 * "optional" — the client may pay online or choose to pay on site.
 * "required" — the booking is only confirmed once the payment settles.
 *
 * A contact request, a WhatsApp click and a quote request are conversations,
 * not transactions: they carry no amount, so they carry no payment.
 */
const onlinePaymentSchema = z.enum(["off", "optional", "required"]);
export type OnlinePayment = z.infer<typeof onlinePaymentSchema>;

/* -------------------------------------------------------------------------- */
/* action_config — settings that depend on the action type, never on the niche  */
/* -------------------------------------------------------------------------- */

export const calendarBookingConfigSchema = z.object({
  duration_minutes: z.number().int().min(5).max(600).default(60),
  buffer_minutes: z.number().int().min(0).max(240).default(0),
  /** Step between two slot starts. Defaults to the duration. */
  slot_interval_minutes: z.number().int().min(5).max(240).nullable().default(null),
  min_notice_hours: z.number().int().min(0).max(720).default(12),
  max_days_ahead: z.number().int().min(1).max(365).default(60),
  requires_confirmation: z.boolean().default(false),
  ask_phone: askPhoneSchema.default("optional"),
  online_payment: onlinePaymentSchema.default("off"),
});

export const directReservationConfigSchema = z.object({
  /** null = unlimited. Counted per requested date when a date is asked. */
  capacity: z.number().int().min(1).max(10000).nullable().default(null),
  date_mode: z.enum(["none", "optional", "required"]).default("optional"),
  max_quantity_per_booking: z.number().int().min(1).max(50).default(1),
  quantity_label: z.string().max(40).nullable().default(null),
  requires_confirmation: z.boolean().default(true),
  ask_phone: askPhoneSchema.default("optional"),
  online_payment: onlinePaymentSchema.default("off"),
});

export const contactRequestConfigSchema = z.object({
  cta_label: z.string().max(40).nullable().default(null),
  message_prompt: z.string().max(200).nullable().default(null),
  ask_phone: askPhoneSchema.default("optional"),
});

export const whatsappDirectConfigSchema = z.object({
  /** Falls back to profiles.whatsapp_number when empty. */
  whatsapp_number: z
    .string()
    .regex(/^\+?[0-9 .-]{6,20}$/, "invalid_phone")
    .nullable()
    .default(null),
  prefilled_message: z.string().max(300).nullable().default(null),
  cta_label: z.string().max(40).nullable().default(null),
});

export const quoteRequestConfigSchema = z.object({
  cta_label: z.string().max(40).nullable().default(null),
  brief_prompt: z.string().max(200).nullable().default(null),
  ask_budget: z.boolean().default(false),
  ask_preferred_date: z.boolean().default(true),
  ask_phone: askPhoneSchema.default("required"),
});

export const actionConfigSchemas = {
  calendar_booking: calendarBookingConfigSchema,
  direct_reservation: directReservationConfigSchema,
  contact_request: contactRequestConfigSchema,
  whatsapp_direct: whatsappDirectConfigSchema,
  quote_request: quoteRequestConfigSchema,
} as const;

export type CalendarBookingConfig = z.infer<typeof calendarBookingConfigSchema>;
export type DirectReservationConfig = z.infer<typeof directReservationConfigSchema>;
export type ContactRequestConfig = z.infer<typeof contactRequestConfigSchema>;
export type WhatsappDirectConfig = z.infer<typeof whatsappDirectConfigSchema>;
export type QuoteRequestConfig = z.infer<typeof quoteRequestConfigSchema>;

export type ActionConfigFor<T extends ActionType> = z.infer<(typeof actionConfigSchemas)[T]>;
export type AnyActionConfig = ActionConfigFor<ActionType>;

/** Parses a stored action_config, filling in defaults for anything missing. */
export function parseActionConfig<T extends ActionType>(
  actionType: T,
  raw: unknown,
): ActionConfigFor<T> {
  const schema = actionConfigSchemas[actionType];
  const result = schema.safeParse(raw && typeof raw === "object" ? raw : {});
  return (result.success ? result.data : schema.parse({})) as ActionConfigFor<T>;
}

export function defaultActionConfig<T extends ActionType>(actionType: T): ActionConfigFor<T> {
  return parseActionConfig(actionType, {});
}

/** Action types that need a phone number question in the public form. */
export function askPhoneFor(actionType: ActionType, config: AnyActionConfig): AskPhone {
  return "ask_phone" in config ? config.ask_phone : "hidden";
}

/** Action types that can carry an amount, and so can be paid online. */
export const PAYABLE_ACTION_TYPES = ["calendar_booking", "direct_reservation"] as const;

export function supportsOnlinePayment(actionType: ActionType): boolean {
  return (PAYABLE_ACTION_TYPES as readonly ActionType[]).includes(actionType);
}

/** How this offer is set up to be paid, "off" for the types that cannot be. */
export function onlinePaymentFor(actionType: ActionType, config: AnyActionConfig): OnlinePayment {
  if (!supportsOnlinePayment(actionType)) return "off";
  return "online_payment" in config ? config.online_payment : "off";
}

export function requiresConfirmation(actionType: ActionType, config: AnyActionConfig): boolean {
  if ("requires_confirmation" in config) return config.requires_confirmation;
  // Messages and quote requests always land as "to process".
  return true;
}

/* -------------------------------------------------------------------------- */
/* Category config (activity_categories.config)                                */
/* -------------------------------------------------------------------------- */

const localizedTextSchema = z.record(z.string(), z.string());

/**
 * Field suggestions a category offers in the offer builder. They keep their
 * own, localized format and are converted into offer fields only when the pro
 * picks one — see fieldFromSuggestion() in ./fields.
 */
export const CATEGORY_FIELD_TYPES = ["text", "textarea", "number", "select", "images"] as const;

export const categoryFieldSchema = z.object({
  key: z.string(),
  type: z.enum(CATEGORY_FIELD_TYPES),
  label: localizedTextSchema,
  placeholder: localizedTextSchema.optional(),
  unit: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: localizedTextSchema })).optional(),
  /** Not suggested for these action types (e.g. duration is already in action_config). */
  skip_for_actions: z.array(actionTypeSchema).optional(),
});

export type CategoryField = z.infer<typeof categoryFieldSchema>;

export const categoryConfigSchema = z.object({
  default_action_type: actionTypeSchema.default("contact_request"),
  suggested_fields: z.array(categoryFieldSchema).default([]),
});

export type CategoryConfig = z.infer<typeof categoryConfigSchema>;

export function parseCategoryConfig(raw: unknown): CategoryConfig {
  const result = categoryConfigSchema.safeParse(raw);
  return result.success ? result.data : categoryConfigSchema.parse({});
}

/** Reads a localized string from a JSONB `{ en, fr }` map. */
export function localized(value: unknown, locale: string, fallback = ""): string {
  if (!value || typeof value !== "object") return fallback;
  const map = value as Record<string, unknown>;
  const candidate = map[locale] ?? map.en ?? Object.values(map)[0];
  return typeof candidate === "string" ? candidate : fallback;
}
