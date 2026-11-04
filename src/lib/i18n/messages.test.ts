import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const enKeys = flatten(en).sort();
const frKeys = flatten(fr).sort();

describe("messages", () => {
  it("has the same keys in every locale", () => {
    expect(frKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !frKeys.includes(key))).toEqual([]);
  });

  it("keeps the same interpolation placeholders in both locales", () => {
    const placeholders = (source: unknown, path: string): string[] => {
      const value = path
        .split(".")
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], source);
      return typeof value === "string"
        ? [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort()
        : [];
    };

    for (const key of enKeys) {
      expect(placeholders(fr, key), `placeholders differ for ${key}`).toEqual(
        placeholders(en, key),
      );
    }
  });

  /** Email copy is addressed with computed keys, so it is checked explicitly. */
  it("contains every key the email senders use", () => {
    const required = [
      "emails.magicLink.subject",
      "emails.magicLink.preview",
      "emails.magicLink.heading",
      "emails.magicLink.body",
      "emails.magicLink.cta",
      "emails.magicLink.fallback",
      "emails.magicLink.ignore",
      "emails.fields.offer",
      "emails.fields.requestedDate",
      "emails.fields.client",
      "emails.fields.email",
      "emails.fields.phone",
      "emails.fields.budget",
      "emails.requestToPro.subject",
      "emails.requestToPro.preview",
      "emails.requestToPro.heading",
      "emails.requestToPro.intro",
      "emails.requestToPro.clientMessage",
      "emails.requestToPro.note",
      "emails.requestToPro.footer",
      "emails.requestAcknowledgement.subject",
      "emails.requestAcknowledgement.preview",
      "emails.requestAcknowledgement.heading",
      "emails.requestAcknowledgement.intro",
      "emails.requestAcknowledgement.yourMessage",
      "emails.requestAcknowledgement.note",
      "emails.requestAcknowledgement.footer",
      "emails.deletionWarning.subject",
      "emails.deletionWarning.preview",
      "emails.deletionWarning.heading",
      "emails.deletionWarning.intro",
      "emails.deletionWarning.dateLabel",
      "emails.deletionWarning.cta",
      "emails.deletionWarning.note",
      "emails.deletionWarning.footer",
    ];

    expect(required.filter((key) => !enKeys.includes(key))).toEqual([]);
  });
});
