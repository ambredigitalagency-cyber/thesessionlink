import { z } from "zod";

import { blockSchemas, defaultConfig, type BlockType } from "@/lib/page/blocks";
import { blocksFor } from "@/lib/page/suggestions";

import { internationalNumber } from "./phone";

/**
 * The main button, the third screen of the sign-up, and what it turns into.
 *
 *   whatsapp  a number (and the message the chat opens with) → a WhatsApp block
 *   call      a number                                       → a Call block
 *   message   nothing                                        → the "Send a message"
 *                                                              offer and its block
 *   link      an address and a label                         → a Link block
 *
 * Plus the trade's suggested blocks, created "to complete": empty, marked as
 * such for the coach, invisible to visitors until filled in and validated.
 */

export const PRIMARY_KINDS = ["whatsapp", "call", "message", "link"] as const;
export type PrimaryKind = (typeof PRIMARY_KINDS)[number];

const country = z.string().regex(/^[A-Z]{2}$/);
const number = z.string().max(30);

export const primaryInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("whatsapp"),
    country,
    number,
    message: z.string().trim().max(300, "too_long").default(""),
  }),
  z.object({ kind: z.literal("call"), country, number }),
  z.object({ kind: z.literal("message") }),
  z.object({
    kind: z.literal("link"),
    url: z.string().max(2000, "too_long"),
    label: z.string().trim().min(1, "required").max(80, "too_long"),
  }),
]);

export type PrimaryInput = z.input<typeof primaryInputSchema>;

export type PrimaryPlan = {
  kind: PrimaryKind;
  /** The main block's config; null for "message", whose block is the offer's. */
  block: Record<string, unknown> | null;
  offerTitle: string | null;
  pending: { type: BlockType; config: Record<string, unknown> }[];
};

/** Blocks never suggested at sign-up: an offer needs its own form, a line has nothing to complete. */
const NOT_SUGGESTED: readonly BlockType[] = ["service", "divider"];

/** The trade's suggested blocks, minus the main button's own type. */
export function pendingBlocksFor(
  categorySlug: string | null | undefined,
  kind: PrimaryKind,
): PrimaryPlan["pending"] {
  return blocksFor(categorySlug)
    .suggested.filter((type) => type !== kind && !NOT_SUGGESTED.includes(type))
    .map((type) => ({
      type,
      // Blank, never prefilled from anything: what they hold, the coach writes.
      config: defaultConfig(type, { phone: null, whatsapp: null, email: null }),
    }));
}

export function planPrimary(
  input: unknown,
  options: { categorySlug: string | null; offerTitle: string },
): { ok: true; plan: PrimaryPlan } | { ok: false; errors: Record<string, string> } {
  const parsed = primaryInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path.map(String).join(".") || "form"] ??= issue.message;
    }
    return { ok: false, errors };
  }

  const data = parsed.data;
  const pending = pendingBlocksFor(options.categorySlug, data.kind);

  switch (data.kind) {
    case "whatsapp":
    case "call": {
      const international = internationalNumber(data.country, data.number);
      if (!international) return { ok: false, errors: { number: "invalid_phone" } };
      const config =
        data.kind === "whatsapp"
          ? { number: international, message: data.message || null, label: null }
          : { number: international, label: null };
      const checked = blockSchemas[data.kind].safeParse(config);
      if (!checked.success) return { ok: false, errors: { number: "invalid_phone" } };
      return {
        ok: true,
        plan: { kind: data.kind, block: checked.data, offerTitle: null, pending },
      };
    }
    case "message":
      return {
        ok: true,
        plan: { kind: "message", block: null, offerTitle: options.offerTitle, pending },
      };
    case "link": {
      const checked = blockSchemas.link.safeParse({ url: data.url, title: data.label });
      if (!checked.success) return { ok: false, errors: { url: "invalid_url" } };
      return { ok: true, plan: { kind: "link", block: checked.data, offerTitle: null, pending } };
    }
  }
}
