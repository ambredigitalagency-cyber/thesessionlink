import { z } from "zod";

import type { ActionType, CategoryField } from "./schema";
import { localized } from "./schema";

/* -------------------------------------------------------------------------- */
/* offers.custom_fields — free-form details the pro builds for each offer      */
/* -------------------------------------------------------------------------- */

/**
 * Stored shape, one entry per field, in display order:
 *
 *   { id, type, definition: { label, …per-type settings }, value }
 *
 * `type` + `definition` describe the field (what the pro configured once);
 * `value` is what they filled in. Keeping the two apart is what lets the public
 * page render each type properly — a choice is resolved to its option label and
 * shown as a badge, a yes/no as a check or a cross — instead of printing raw
 * values. Order is the array order.
 *
 * Every value is nullable (or an empty array): a field can exist before it is
 * filled, and empty fields are simply not shown publicly.
 */
export const FIELD_TYPES = [
  "text",
  "number",
  "select",
  "multiselect",
  "boolean",
  "time",
  "images",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_LIMITS = {
  fields: 24,
  options: 20,
  label: 60,
  optionLabel: 60,
  unit: 16,
  shortText: 200,
  longText: 2000,
  images: 12,
  /** One week — the longest duration a detail can sensibly describe. */
  durationMinutes: 7 * 24 * 60,
} as const;

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "invalid_input");
const labelSchema = z.string().trim().min(1, "field_label_required").max(FIELD_LIMITS.label);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalid_time");

const optionSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1, "option_label_required").max(FIELD_LIMITS.optionLabel),
});

export type FieldOption = z.infer<typeof optionSchema>;

const optionsSchema = z
  .array(optionSchema)
  .min(1, "options_required")
  .max(FIELD_LIMITS.options)
  .superRefine((options, ctx) => {
    const seen = new Set<string>();
    options.forEach((option, index) => {
      const key = option.label.toLocaleLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: "option_duplicate", path: [index, "label"] });
      }
      seen.add(key);
    });
    if (new Set(options.map((option) => option.id)).size !== options.length) {
      ctx.addIssue({ code: "custom", message: "invalid_input" });
    }
  });

const timeRangeSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((range) => range.start < range.end, { message: "time_range_order", path: ["end"] });

const durationSchema = z.object({
  minutes: z.number().int().min(1, "invalid_input").max(FIELD_LIMITS.durationMinutes),
});

const textFieldSchema = z.object({
  id: idSchema,
  type: z.literal("text"),
  definition: z.object({ label: labelSchema, multiline: z.boolean().default(false) }),
  value: z
    .string()
    .trim()
    .max(FIELD_LIMITS.longText)
    .nullable()
    .transform((value) => value || null),
});

const numberFieldSchema = z.object({
  id: idSchema,
  type: z.literal("number"),
  definition: z.object({
    label: labelSchema,
    unit: z
      .string()
      .trim()
      .max(FIELD_LIMITS.unit)
      .nullish()
      .transform((unit) => unit || null),
  }),
  value: z.number("invalid_number").finite().min(-1e9).max(1e9).nullable(),
});

const selectFieldSchema = z.object({
  id: idSchema,
  type: z.literal("select"),
  definition: z.object({ label: labelSchema, options: optionsSchema }),
  value: idSchema.nullable(),
});

const multiselectFieldSchema = z.object({
  id: idSchema,
  type: z.literal("multiselect"),
  definition: z.object({ label: labelSchema, options: optionsSchema }),
  value: z.array(idSchema).max(FIELD_LIMITS.options).default([]),
});

const booleanFieldSchema = z.object({
  id: idSchema,
  type: z.literal("boolean"),
  definition: z.object({ label: labelSchema }),
  value: z.boolean("invalid_input").nullable(),
});

const timeFieldSchema = z.object({
  id: idSchema,
  type: z.literal("time"),
  definition: z.object({ label: labelSchema, mode: z.enum(["range", "duration"]) }),
  value: z.union([timeRangeSchema, durationSchema]).nullable(),
});

const imagesFieldSchema = z.object({
  id: idSchema,
  type: z.literal("images"),
  definition: z.object({ label: labelSchema }),
  value: z.array(z.string().trim().min(1).max(500)).max(FIELD_LIMITS.images).default([]),
});

/**
 * One field, with the rules that span definition and value: a choice must be
 * one of the field's own options, a time value must match the field's mode, a
 * short text stays short.
 */
export const offerFieldSchema = z
  .discriminatedUnion("type", [
    textFieldSchema,
    numberFieldSchema,
    selectFieldSchema,
    multiselectFieldSchema,
    booleanFieldSchema,
    timeFieldSchema,
    imagesFieldSchema,
  ])
  .superRefine((field, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message, path: ["value"] });

    switch (field.type) {
      case "text":
        if (
          !field.definition.multiline &&
          field.value &&
          field.value.length > FIELD_LIMITS.shortText
        ) {
          fail("text_too_long");
        }
        break;
      case "select":
        if (
          field.value !== null &&
          !field.definition.options.some((option) => option.id === field.value)
        ) {
          fail("option_unknown");
        }
        break;
      case "multiselect": {
        const ids = new Set(field.definition.options.map((option) => option.id));
        if (field.value.some((id) => !ids.has(id))) fail("option_unknown");
        if (new Set(field.value).size !== field.value.length) fail("invalid_input");
        break;
      }
      case "time":
        if (
          field.value !== null &&
          "minutes" in field.value !== (field.definition.mode === "duration")
        ) {
          fail("invalid_input");
        }
        break;
    }
  });

export type OfferField = z.output<typeof offerFieldSchema>;
export type OfferFieldOf<T extends FieldType> = Extract<OfferField, { type: T }>;
export type TimeRange = z.infer<typeof timeRangeSchema>;

export const offerFieldsSchema = z
  .array(offerFieldSchema)
  .max(FIELD_LIMITS.fields)
  .superRefine((fields, ctx) => {
    if (new Set(fields.map((field) => field.id)).size !== fields.length) {
      ctx.addIssue({ code: "custom", message: "invalid_input" });
    }
  });

/**
 * Reads stored custom_fields. Entries are checked one by one so a single bad
 * entry is dropped instead of blanking every detail of the offer.
 */
export function parseOfferFields(raw: unknown): OfferField[] {
  if (!Array.isArray(raw)) return [];
  const fields: OfferField[] = [];
  for (const entry of raw) {
    const result = offerFieldSchema.safeParse(entry);
    if (result.success) fields.push(result.data);
  }
  return fields;
}

/** False for fields the pro added but left empty. A "no" is a value. */
export function isFieldFilled(field: OfferField): boolean {
  if (Array.isArray(field.value)) return field.value.length > 0;
  return field.value !== null;
}

/** Drops fields the pro left empty so the public page stays clean. */
export function visibleFields(fields: OfferField[]): OfferField[] {
  return fields.filter(isFieldFilled);
}

export type GalleryPhoto = { url: string; caption: string | null };

/**
 * Offer photos followed by the photos of its photo fields, for the gallery.
 * A field's photos carry the field's label as their caption ("The studio");
 * the offer's own photos have none. A photo used twice is shown once.
 */
export function galleryPhotos(photos: string[], fields: OfferField[]): GalleryPhoto[] {
  const all: GalleryPhoto[] = [
    ...photos.map((url) => ({ url, caption: null })),
    ...fields.flatMap((field) =>
      field.type === "images"
        ? field.value.map((url) => ({ url, caption: field.definition.label }))
        : [],
    ),
  ];
  const seen = new Set<string>();
  return all.filter((photo) => {
    if (seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Building fields                                                             */
/* -------------------------------------------------------------------------- */

export function newFieldId(prefix = "f"): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

/** An empty field of the given type, ready for the pro to configure. */
export function createField(type: FieldType, label = ""): OfferField {
  const id = newFieldId();
  switch (type) {
    case "text":
      return { id, type, definition: { label, multiline: false }, value: null };
    case "number":
      return { id, type, definition: { label, unit: null }, value: null };
    case "select":
    case "multiselect": {
      const options = [{ id: newFieldId("o"), label: "" }];
      return type === "select"
        ? { id, type, definition: { label, options }, value: null }
        : { id, type, definition: { label, options }, value: [] };
    }
    case "boolean":
      // Unanswered until the pro picks yes or no: the field stays hidden
      // publicly rather than claiming a "no" nobody chose.
      return { id, type, definition: { label }, value: null };
    case "time":
      return { id, type, definition: { label, mode: "range" }, value: null };
    case "images":
      return { id, type, definition: { label }, value: [] };
  }
}

/**
 * Turns a category suggestion (activity_categories.config.suggested_fields)
 * into a field. Suggestions are offered, never imposed: nothing is added until
 * the pro picks one.
 */
export function fieldFromSuggestion(suggestion: CategoryField, locale: string): OfferField {
  const label = localized(suggestion.label, locale, suggestion.key).slice(0, FIELD_LIMITS.label);
  const id = newFieldId();

  switch (suggestion.type) {
    case "textarea":
      return { id, type: "text", definition: { label, multiline: true }, value: null };
    case "number":
      return {
        id,
        type: "number",
        definition: { label, unit: suggestion.unit ?? null },
        value: null,
      };
    case "select":
      return {
        id,
        type: "select",
        definition: {
          label,
          options: (suggestion.options ?? []).map((option) => ({
            id: option.value,
            label: localized(option.label, locale, option.value),
          })),
        },
        value: null,
      };
    case "images":
      return { id, type: "images", definition: { label }, value: [] };
    default:
      return { id, type: "text", definition: { label, multiline: false }, value: null };
  }
}

/** Category suggestions relevant to this action type and not already added. */
export function availableSuggestions(
  suggestions: CategoryField[],
  fields: OfferField[],
  actionType: ActionType,
  locale: string,
): CategoryField[] {
  const taken = new Set(fields.map((field) => field.definition.label.trim().toLocaleLowerCase()));
  return suggestions.filter(
    (suggestion) =>
      !suggestion.skip_for_actions?.includes(actionType) &&
      !taken.has(localized(suggestion.label, locale, suggestion.key).toLocaleLowerCase()),
  );
}

/* -------------------------------------------------------------------------- */
/* Display                                                                     */
/* -------------------------------------------------------------------------- */

function intlLocale(locale: string) {
  return locale === "fr" ? "fr-FR" : "en-US";
}

export function optionLabels(
  field: OfferFieldOf<"select"> | OfferFieldOf<"multiselect">,
): string[] {
  const ids = field.type === "select" ? (field.value ? [field.value] : []) : field.value;
  return ids
    .map((id) => field.definition.options.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

export function formatNumber(value: number, locale: string, unit?: string | null): string {
  const formatted = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(
    value,
  );
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatTimeOfDay(value: string, locale: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, hours, minutes)));
}

export function formatDuration(minutes: number, locale: string): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const unit = (value: number, kind: "day" | "hour" | "minute") =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: "unit",
      unit: kind,
      unitDisplay: kind === "day" ? "long" : "short",
    }).format(value);

  return [days && unit(days, "day"), hours && unit(hours, "hour"), rest && unit(rest, "minute")]
    .filter(Boolean)
    .join(" ");
}

export function formatTimeValue(field: OfferFieldOf<"time">, locale: string): string | null {
  if (!field.value) return null;
  if ("minutes" in field.value) return formatDuration(field.value.minutes, locale);
  return `${formatTimeOfDay(field.value.start, locale)} – ${formatTimeOfDay(field.value.end, locale)}`;
}

/**
 * A one-line text version of a field's value, for summaries such as the chips
 * on an offer card. Null when the type has no sensible one-liner (photos,
 * yes/no, long text) or the field is empty.
 */
export function fieldSummary(field: OfferField, locale: string): string | null {
  if (!isFieldFilled(field)) return null;
  switch (field.type) {
    case "text":
      return field.definition.multiline ? null : field.value;
    case "number":
      return field.value === null ? null : formatNumber(field.value, locale, field.definition.unit);
    case "select":
    case "multiselect":
      return optionLabels(field).join(", ") || null;
    case "time":
      return formatTimeValue(field, locale);
    default:
      return null;
  }
}
