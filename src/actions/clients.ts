"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfileForAction } from "@/lib/auth";
import { normaliseTags, TAG_LIMITS } from "@/lib/crm/segments";
import { offerFieldsSchema } from "@/lib/offers/fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, type ActionResult } from "@/lib/validation";

/**
 * The client record the coach edits by hand.
 *
 * health_notes is medical information: it is validated and stored like the
 * rest, but never printed — the error branch below logs the Postgres error
 * only, never the payload.
 */
const clientRecordSchema = z.object({
  name: z.string().trim().min(1, "required").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((value) => value || null),
  birth_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date")
    .nullish()
    .or(z.literal(""))
    .transform((value) => value || null),
  address: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value || null),
  health_notes: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(10000)
    .nullish()
    .transform((value) => value || null),
  // Same shape, same rules and same editor as an offer's custom fields.
  custom_fields: offerFieldsSchema.default([]),
});

export type ClientRecordInput = z.input<typeof clientRecordSchema>;

export async function updateClientRecord(clientId: string, input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = clientRecordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", clientId)
    .eq("profile_id", profile.id);

  if (error) {
    // The record carries medical notes: log the failure, never the values.
    console.error("[clients] record update failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const tagsSchema = z.array(z.string().max(TAG_LIMITS.length + 10)).max(TAG_LIMITS.perClient * 2);

/** Tags are replaced wholesale: the editor always sends the full list. */
export async function setClientTags(clientId: string, tags: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = tagsSchema.safeParse(tags);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ tags: normaliseTags(parsed.data) })
    .eq("id", clientId)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("[clients] tags update failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
