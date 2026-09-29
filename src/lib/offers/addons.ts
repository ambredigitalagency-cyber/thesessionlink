import { z } from "zod";

import { toMinorUnits } from "@/lib/payments/amount";

import type { ActionType } from "./schema";

/**
 * Add-ons: extras a client ticks when booking — "towel and shower +5 €".
 *
 * Only on the two action types that are a transaction: a contact message or
 * a quote request has no price to add to. The offer holds the list; a booking
 * holds a copy of what was taken, priced as it was that day.
 */

export const ADDON_ACTION_TYPES: readonly ActionType[] = ["calendar_booking", "direct_reservation"];
export const ADDON_LIMITS = { count: 6, label: 60, description: 120, price: 100_000 } as const;

export function acceptsAddons(actionType: ActionType): boolean {
  return ADDON_ACTION_TYPES.includes(actionType);
}

export const addonSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "invalid_input"),
  label: z.string().trim().min(1, "addon_label_required").max(ADDON_LIMITS.label),
  price: z.number("invalid_number").min(0).max(ADDON_LIMITS.price),
  description: z
    .string()
    .trim()
    .max(ADDON_LIMITS.description)
    .nullish()
    .transform((value) => value || null),
});

export type Addon = z.output<typeof addonSchema>;

export const addonsSchema = z
  .array(addonSchema)
  .max(ADDON_LIMITS.count)
  .superRefine((addons, ctx) => {
    if (new Set(addons.map((addon) => addon.id)).size !== addons.length) {
      ctx.addIssue({ code: "custom", message: "invalid_input" });
    }
  })
  .default([]);

/** What a booking keeps of an add-on: enough to show and to account for it. */
export type TakenAddon = { id: string; label: string; price: number };

/** Reads stored add-ons, dropping any entry that no longer fits the shape. */
export function parseAddons(raw: unknown): Addon[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const result = addonSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
}

/**
 * The add-ons a client asked for, resolved against what the offer really
 * offers. Unknown ids — a stale page, a crafted request — are ignored rather
 * than refused: the booking goes through with what exists.
 */
export function pickAddons(offered: Addon[], chosen: readonly string[]): TakenAddon[] {
  const wanted = new Set(chosen);
  return offered
    .filter((addon) => wanted.has(addon.id))
    .map(({ id, label, price }) => ({ id, label, price }));
}

/** Reads the add-ons stored on a booking. */
export function parseTakenAddons(raw: unknown): TakenAddon[] {
  return parseAddons(raw).map(({ id, label, price }) => ({ id, label, price }));
}

/** The add-ons' total, in minor units. Per booking, not per seat. */
export function addonsTotal(taken: readonly TakenAddon[], currency: string): number {
  return taken.reduce((sum, addon) => sum + toMinorUnits(addon.price, currency), 0);
}

export function newAddonId(): string {
  return `a_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}
