import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fieldFromSuggestion, offerFieldSchema } from "./fields";
import { ACTION_TYPES, categoryConfigSchema, localized, type CategoryField } from "./schema";

/**
 * The templates live in a data migration, so the only thing standing between
 * a typo there and a broken offer builder is this file: every template must
 * parse with the schema the app reads it with, and every field it holds must
 * turn into a valid offer field in both languages.
 */
const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261001000001_offer_templates.sql"),
  "utf8",
);

const templates = [
  ...sql.matchAll(/'\{templates\}', '([\s\S]*?)'::jsonb, true\)\s+where slug = '([a-z-]+)';/g),
].map(([, json, slug]) => ({ slug, raw: JSON.parse(json.replaceAll("''", "'")) as unknown }));

describe("offer templates migration", () => {
  it("covers every activity of the catalogue", () => {
    expect(templates.map((template) => template.slug)).toEqual([
      "fitness-coach",
      "life-coach",
      "real-estate",
      "hairdresser",
      "beauty",
      "wellness",
      "music-teacher",
      "tutor",
      "photographer",
      "therapist",
      "consultant",
      "rental",
      "other",
    ]);
  });

  it.each(templates)("$slug: 2 to 4 fields for each of the five actions", ({ raw }) => {
    const config = categoryConfigSchema.parse({ templates: raw });
    for (const action of ACTION_TYPES) {
      const fields = config.templates[action] ?? [];
      expect(fields.length, action).toBeGreaterThanOrEqual(2);
      expect(fields.length, action).toBeLessThanOrEqual(4);
      expect(new Set(fields.map((field) => field.key)).size, action).toBe(fields.length);
    }
  });

  it.each(templates)(
    "$slug: every field becomes a valid offer field, in French and English",
    ({ raw }) => {
      const config = categoryConfigSchema.parse({ templates: raw });
      for (const fields of Object.values(config.templates)) {
        for (const suggestion of fields ?? []) {
          for (const locale of ["fr", "en"]) {
            expect(localized(suggestion.label, locale), suggestion.key).not.toBe("");
            const field = fieldFromSuggestion(suggestion, locale);
            expect(offerFieldSchema.safeParse(field).success, `${suggestion.key}/${locale}`).toBe(
              true,
            );
          }
        }
      }
    },
  );
});

describe("template field types", () => {
  it("turns multiselect, yes/no and time suggestions into empty fields of that type", () => {
    const suggestions: CategoryField[] = [
      {
        key: "goals",
        type: "multiselect",
        label: { en: "Goals", fr: "Objectifs" },
        options: [
          { value: "muscle", label: { en: "Muscle gain", fr: "Prise de muscle" } },
          { value: "fitness", label: { en: "Fitness", fr: "Remise en forme" } },
        ],
      },
      {
        key: "equipment",
        type: "boolean",
        label: { en: "Equipment provided", fr: "Matériel fourni" },
      },
      { key: "schedule", type: "time", label: { en: "Time", fr: "Horaire" } },
      { key: "length", type: "time", mode: "duration", label: { en: "Length", fr: "Durée" } },
    ];
    const [goals, equipment, schedule, length] = suggestions.map((item) =>
      fieldFromSuggestion(item, "fr"),
    );
    expect(goals).toMatchObject({
      type: "multiselect",
      definition: {
        label: "Objectifs",
        options: [{ id: "muscle", label: "Prise de muscle" }, { id: "fitness" }],
      },
      value: [],
    });
    expect(equipment).toMatchObject({ type: "boolean", value: null });
    expect(schedule).toMatchObject({ type: "time", definition: { mode: "range" }, value: null });
    expect(length).toMatchObject({ type: "time", definition: { mode: "duration" } });
  });
});
