import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Action types                                                                */
/* -------------------------------------------------------------------------- */

export const ACTION_TYPES = ["contact_request", "whatsapp_direct", "quote_request"] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const actionTypeSchema = z.enum(ACTION_TYPES);

const askPhoneSchema = z.enum(["hidden", "optional", "required"]);
export type AskPhone = z.infer<typeof askPhoneSchema>;

/* -------------------------------------------------------------------------- */
/* action_config — settings that depend on the action type, never on the niche  */
/* -------------------------------------------------------------------------- */

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
  contact_request: contactRequestConfigSchema,
  whatsapp_direct: whatsappDirectConfigSchema,
  quote_request: quoteRequestConfigSchema,
} as const;

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

/* -------------------------------------------------------------------------- */
/* Category config (activity_categories.config)                                */
/* -------------------------------------------------------------------------- */

const localizedTextSchema = z.record(z.string(), z.string());

/**
 * Field suggestions a category offers in the offer builder. They keep their
 * own, localized format and are converted into offer fields only when the pro
 * picks one — see fieldFromSuggestion() in ./fields.
 */
export const CATEGORY_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "multiselect",
  "boolean",
  "time",
  "images",
] as const;

export const categoryFieldSchema = z.object({
  key: z.string(),
  type: z.enum(CATEGORY_FIELD_TYPES),
  label: localizedTextSchema,
  placeholder: localizedTextSchema.optional(),
  unit: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: localizedTextSchema })).optional(),
  /** For `time`: a time of day range (the default) or a duration. */
  mode: z.enum(["range", "duration"]).optional(),
  /** Not suggested for these action types (e.g. duration is already in action_config). */
  skip_for_actions: z.array(actionTypeSchema).optional(),
});

export type CategoryField = z.infer<typeof categoryFieldSchema>;

/** At most four: a template is a head start, not a form to wade through. */
export const TEMPLATE_MAX_FIELDS = 4;

export const categoryConfigSchema = z.object({
  default_action_type: actionTypeSchema.default("contact_request"),
  suggested_fields: z.array(categoryFieldSchema).default([]),
  /**
   * The details this activity usually shows for each action type — a quote
   * request is described differently from a WhatsApp chat. Offered ticked
   * when an offer is built.
   */
  templates: z
    .partialRecord(actionTypeSchema, z.array(categoryFieldSchema).max(TEMPLATE_MAX_FIELDS))
    .default({}),
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
