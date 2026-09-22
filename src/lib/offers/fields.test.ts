import { describe, expect, it } from "vitest";

import { offerInputSchema } from "@/lib/validation";

import {
  FIELD_TYPES,
  availableSuggestions,
  createField,
  fieldFromSuggestion,
  fieldSummary,
  galleryPhotos,
  offerFieldSchema,
  offerFieldsSchema,
  parseOfferFields,
  visibleFields,
  type OfferField,
} from "./fields";
import type { CategoryField } from "./schema";

const options = [
  { id: "beginner", label: "Débutant" },
  { id: "advanced", label: "Avancé" },
];

const valid: Record<string, OfferField> = {
  text: {
    id: "f_text",
    type: "text",
    definition: { label: "Lieu", multiline: false },
    value: "Parc",
  },
  number: {
    id: "f_num",
    type: "number",
    definition: { label: "Surface", unit: "m²" },
    value: 45.5,
  },
  select: {
    id: "f_sel",
    type: "select",
    definition: { label: "Niveau", options },
    value: "advanced",
  },
  multiselect: {
    id: "f_multi",
    type: "multiselect",
    definition: { label: "Niveaux", options },
    value: ["beginner", "advanced"],
  },
  boolean: { id: "f_bool", type: "boolean", definition: { label: "Parking" }, value: false },
  range: {
    id: "f_range",
    type: "time",
    definition: { label: "Horaires", mode: "range" },
    value: { start: "09:00", end: "12:30" },
  },
  duration: {
    id: "f_dur",
    type: "time",
    definition: { label: "Durée", mode: "duration" },
    value: { minutes: 90 },
  },
  images: {
    id: "f_img",
    type: "images",
    definition: { label: "Studio" },
    value: ["https://x/a.jpg"],
  },
};

function issues(field: unknown) {
  const result = offerFieldSchema.safeParse(field);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("offerFieldSchema", () => {
  it("accepts a valid field of every type", () => {
    for (const field of Object.values(valid)) {
      expect(issues(field), field.id).toEqual([]);
    }
  });

  it("accepts every type empty, as a freshly added field", () => {
    for (const type of FIELD_TYPES) {
      const field = createField(type, "Label");
      if (field.type === "select" || field.type === "multiselect") {
        field.definition.options[0].label = "Option";
      }
      expect(issues(field), type).toEqual([]);
    }
  });

  it("rejects a value of the wrong kind for the type", () => {
    expect(issues({ ...valid.number, value: "12" })).toContain("invalid_number");
    expect(issues({ ...valid.boolean, value: "yes" })).toContain("invalid_input");
    expect(issues({ ...valid.text, value: 12 })).not.toEqual([]);
    expect(issues({ ...valid.multiselect, value: "beginner" })).not.toEqual([]);
  });

  it("requires a label", () => {
    expect(issues({ ...valid.text, definition: { label: "  ", multiline: false } })).toContain(
      "field_label_required",
    );
  });

  it("only accepts a choice among the field's own options", () => {
    expect(issues({ ...valid.select, value: "expert" })).toContain("option_unknown");
    expect(issues({ ...valid.multiselect, value: ["beginner", "expert"] })).toContain(
      "option_unknown",
    );
  });

  it("requires at least one option, each named once", () => {
    expect(
      issues({ ...valid.select, definition: { label: "Niveau", options: [] }, value: null }),
    ).toContain("options_required");
    expect(
      issues({
        ...valid.select,
        definition: {
          label: "Niveau",
          options: [
            { id: "a", label: "Débutant" },
            { id: "b", label: "débutant" },
          ],
        },
        value: null,
      }),
    ).toContain("option_duplicate");
    expect(
      issues({
        ...valid.select,
        definition: { label: "Niveau", options: [{ id: "a", label: "" }] },
      }),
    ).toContain("option_label_required");
  });

  it("keeps short texts short unless the field is multiline", () => {
    const long = "x".repeat(250);
    expect(issues({ ...valid.text, value: long })).toContain("text_too_long");
    expect(
      issues({ ...valid.text, definition: { label: "Notes", multiline: true }, value: long }),
    ).toEqual([]);
  });

  it("checks time values against the field's mode and order", () => {
    expect(issues({ ...valid.range, value: { start: "12:00", end: "09:00" } })).toContain(
      "time_range_order",
    );
    expect(issues({ ...valid.range, value: { start: "25:00", end: "26:00" } })).toContain(
      "invalid_time",
    );
    expect(issues({ ...valid.range, value: { minutes: 30 } })).toContain("invalid_input");
    expect(issues({ ...valid.duration, value: { minutes: 0 } })).not.toEqual([]);
  });

  it("normalises an empty text to null", () => {
    const parsed = offerFieldSchema.parse({ ...valid.text, value: "   " });
    expect(parsed.value).toBeNull();
  });
});

describe("offerFieldsSchema", () => {
  it("rejects duplicate field ids", () => {
    expect(offerFieldsSchema.safeParse([valid.text, valid.text]).success).toBe(false);
  });

  it("is what the server validates, with errors keyed to the field", () => {
    const result = offerInputSchema.safeParse({
      title: "Coaching",
      action_type: "contact_request",
      custom_fields: [valid.text, { ...valid.select, value: "expert" }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["custom_fields", 1, "value"]);
  });
});

describe("parseOfferFields", () => {
  it("drops only the entries that no longer parse", () => {
    const legacy = {
      id: "suggested-format",
      key: "format",
      label: "Format",
      type: "select",
      value: "En ligne",
    };
    expect(parseOfferFields([valid.text, legacy, valid.number]).map((field) => field.id)).toEqual([
      "f_text",
      "f_num",
    ]);
    expect(parseOfferFields("not an array")).toEqual([]);
  });
});

describe("yes / no fields", () => {
  const answered = (value: boolean | null): OfferField => ({
    id: "f_parking",
    type: "boolean",
    definition: { label: "Parking" },
    value,
  });

  it("start unanswered and stay hidden until the pro picks an answer", () => {
    const fresh = createField("boolean", "Parking");
    expect(fresh.value).toBeNull();
    expect(issues(fresh)).toEqual([]);
    expect(visibleFields([fresh])).toEqual([]);
    expect(visibleFields([answered(null)])).toEqual([]);
    expect(visibleFields([answered(true)])).toHaveLength(1);
    expect(visibleFields([answered(false)])).toHaveLength(1);
  });
});

describe("galleryPhotos", () => {
  it("appends field photos captioned with the field's name, once each", () => {
    const studio: OfferField = {
      id: "f_img",
      type: "images",
      definition: { label: "Studio" },
      value: ["https://x/a.jpg", "https://x/b.jpg"],
    };
    expect(galleryPhotos(["https://x/main.jpg", "https://x/a.jpg"], [valid.text, studio])).toEqual([
      { url: "https://x/main.jpg", caption: null },
      { url: "https://x/a.jpg", caption: null },
      { url: "https://x/b.jpg", caption: "Studio" },
    ]);
  });
});

describe("visibleFields", () => {
  it("hides empty fields but keeps a no", () => {
    const empty = createField("text", "Vide");
    const shown = visibleFields([empty, valid.boolean, createField("images", "Galerie")]);
    expect(shown.map((field) => field.id)).toEqual(["f_bool"]);
  });
});

describe("suggestions", () => {
  const suggestions: CategoryField[] = [
    {
      key: "level",
      type: "select",
      label: { en: "Level", fr: "Niveau" },
      options: [
        { value: "beginner", label: { en: "Beginner", fr: "Débutant" } },
        { value: "advanced", label: { en: "Advanced", fr: "Avancé" } },
      ],
    },
    { key: "includes", type: "textarea", label: { en: "Included", fr: "Inclus" } },
    {
      key: "duration",
      type: "number",
      unit: "min",
      label: { en: "Duration", fr: "Durée" },
      skip_for_actions: ["calendar_booking"],
    },
  ];

  it("turns a category suggestion into a valid, empty field in the pro's language", () => {
    const field = fieldFromSuggestion(suggestions[0], "fr");
    expect(field).toMatchObject({
      type: "select",
      definition: {
        label: "Niveau",
        options: [
          { id: "beginner", label: "Débutant" },
          { id: "advanced", label: "Avancé" },
        ],
      },
      value: null,
    });
    expect(issues(field)).toEqual([]);
    expect(fieldFromSuggestion(suggestions[1], "fr")).toMatchObject({
      type: "text",
      definition: { multiline: true },
    });
  });

  it("offers only suggestions that fit the action and are not already added", () => {
    const added = [fieldFromSuggestion(suggestions[0], "fr")];
    const available = availableSuggestions(suggestions, added, "calendar_booking", "fr");
    expect(available.map((item) => item.key)).toEqual(["includes"]);
  });
});

describe("fieldSummary", () => {
  // Intl picks regular, no-break or narrow no-break spaces depending on the
  // ICU version; only the visible text matters here.
  const summary = (field: OfferField, locale: string) =>
    fieldSummary(field, locale)?.replace(/[  ]/g, " ") ?? null;

  it("formats each type for a one-line summary", () => {
    expect(summary(valid.number, "fr")).toBe("45,5 m²");
    expect(summary(valid.select, "fr")).toBe("Avancé");
    expect(summary(valid.multiselect, "fr")).toBe("Débutant, Avancé");
    expect(summary(valid.range, "fr")).toBe("9:00 – 12:30");
    expect(summary(valid.range, "en")).toBe("9:00 AM – 12:30 PM");
    expect(summary(valid.duration, "fr")).toBe("1 h 30 min");
    expect(summary(valid.boolean, "fr")).toBeNull();
    expect(summary(valid.images, "fr")).toBeNull();
  });
});
