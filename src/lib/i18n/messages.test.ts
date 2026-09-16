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
      "emails.fields.when",
      "emails.fields.time",
      "emails.fields.requestedDate",
      "emails.fields.quantity",
      "emails.fields.client",
      "emails.fields.email",
      "emails.fields.phone",
      "emails.fields.budget",
      "emails.clientConfirmation.confirmed.subject",
      "emails.clientConfirmation.confirmed.preview",
      "emails.clientConfirmation.confirmed.heading",
      "emails.clientConfirmation.confirmed.intro",
      "emails.clientConfirmation.pending.subject",
      "emails.clientConfirmation.pending.preview",
      "emails.clientConfirmation.pending.heading",
      "emails.clientConfirmation.pending.intro",
      "emails.clientConfirmation.yourMessage",
      "emails.clientConfirmation.cta",
      "emails.clientConfirmation.note",
      "emails.clientConfirmation.footer",
      "emails.proNotification.subject",
      "emails.proNotification.preview",
      "emails.proNotification.headingConfirmed",
      "emails.proNotification.headingPending",
      "emails.proNotification.intro",
      "emails.proNotification.clientMessage",
      "emails.proNotification.cta",
      "emails.proNotification.footer",
      "emails.reminder.subject",
      "emails.reminder.heading",
      "emails.reminder.intro",
      "emails.reminder.cta",
      "emails.reminder.note",
      "emails.reminder.footer",
      "emails.statusUpdate.confirmed.subject",
      "emails.statusUpdate.confirmed.preview",
      "emails.statusUpdate.confirmed.heading",
      "emails.statusUpdate.confirmed.intro",
      "emails.statusUpdate.confirmed.cta",
      "emails.statusUpdate.confirmed.footer",
      "emails.statusUpdate.cancelled.subject",
      "emails.statusUpdate.cancelled.preview",
      "emails.statusUpdate.cancelled.heading",
      "emails.statusUpdate.cancelled.intro",
      "emails.statusUpdate.cancelled.cta",
      "emails.statusUpdate.cancelled.footer",
      "emails.clientCancellation.subject",
      "emails.clientCancellation.preview",
      "emails.clientCancellation.heading",
      "emails.clientCancellation.intro",
      "emails.clientCancellation.cta",
      "emails.clientCancellation.footer",
    ];

    expect(required.filter((key) => !enKeys.includes(key))).toEqual([]);
  });
});
