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
});

export const directReservationConfigSchema = z.object({
  /** null = unlimited. Counted per requested date when a date is asked. */
  capacity: z.number().int().min(1).max(10000).nullable().default(null),
  date_mode: z.enum(["none", "optional", "required"]).default("optional"),
  max_quantity_per_booking: z.number().int().min(1).max(50).default(1),
  quantity_label: z.string().max(40).nullable().default(null),
  requires_confirmation: z.boolean().default(true),
  ask_phone: askPhoneSchema.default("optional"),
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

export function requiresConfirmation(actionType: ActionType, config: AnyActionConfig): boolean {
  if ("requires_confirmation" in config) return config.requires_confirmation;
  // Messages and quote requests always land as "to process".
  return true;
}

/* -------------------------------------------------------------------------- */
/* custom_fields — category suggestions + free-form fields added by the pro     */
/* -------------------------------------------------------------------------- */

export const FIELD_TYPES = ["text", "textarea", "number", "select", "images"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const offerFieldSchema = z.object({
  id: z.string().min(1).max(40),
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(60),
  type: z.enum(FIELD_TYPES),
  value: z.union([
    z.string().max(2000),
    z.number(),
    z.array(z.string().max(500)).max(12),
    z.null(),
  ]),
  unit: z.string().max(16).nullish(),
  source: z.enum(["suggested", "custom"]).default("custom"),
});

export type OfferField = z.infer<typeof offerFieldSchema>;

export const offerFieldsSchema = z.array(offerFieldSchema).max(24);

export function parseOfferFields(raw: unknown): OfferField[] {
  const result = offerFieldsSchema.safeParse(raw);
  return result.success ? result.data : [];
}

/** Drops fields the pro left empty so the public page stays clean. */
export function visibleFields(fields: OfferField[]): OfferField[] {
  return fields.filter((field) => {
    if (field.value === null || field.value === "") return false;
    if (Array.isArray(field.value)) return field.value.length > 0;
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Category config (activity_categories.config)                                */
/* -------------------------------------------------------------------------- */

const localizedTextSchema = z.record(z.string(), z.string());

export const categoryFieldSchema = z.object({
  key: z.string(),
  type: z.enum(FIELD_TYPES),
  label: localizedTextSchema,
  placeholder: localizedTextSchema.optional(),
  unit: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: localizedTextSchema })).optional(),
  /** Hidden for these action types (e.g. duration is already in action_config). */
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
