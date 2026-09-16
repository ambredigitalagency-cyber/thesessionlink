"use server";

import { revalidatePath } from "next/cache";

import { requireProfileForAction } from "@/lib/auth";
import { parseActionConfig } from "@/lib/offers/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, offerInputSchema, type ActionResult } from "@/lib/validation";

function revalidateOffers(slug: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${slug}`);
}

/** Validates the payload and normalises action_config for the chosen action. */
function prepare(input: unknown) {
  const parsed = offerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { action_config, price, price_type, ...rest } = parsed.data;

  return {
    ok: true as const,
    values: {
      ...rest,
      price_type,
      // "free" and "on_request" never carry an amount.
      price: price_type === "free" || price_type === "on_request" ? null : price,
      action_config: parseActionConfig(parsed.data.action_type, action_config),
    },
  };
}

export async function createOffer(input: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await requireProfileForAction();
  const prepared = prepare(input);
  if (!prepared.ok) return { ok: false, error: "invalid_input", fieldErrors: prepared.fieldErrors };

  const supabase = await createSupabaseServerClient();

  const { data: last } = await supabase
    .from("offers")
    .select("position")
    .eq("profile_id", profile.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("offers")
    .insert({
      ...prepared.values,
      profile_id: profile.id,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[offers] create failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateOffers(profile.slug);
  return { ok: true, data: { id: data.id } };
}

export async function updateOffer(id: string, input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const prepared = prepare(input);
  if (!prepared.ok) return { ok: false, error: "invalid_input", fieldErrors: prepared.fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("offers")
    .update(prepared.values)
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    console.error("[offers] update failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateOffers(profile.slug);
  return { ok: true };
}

export async function setOfferActive(id: string, isActive: boolean): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("offers")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidateOffers(profile.slug);
  return { ok: true };
}

export async function deleteOffer(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  if ((count ?? 0) <= 1) {
    // Onboarding guarantees at least one offer; keep that invariant.
    return { ok: false, error: "last_offer" };
  }

  const { error } = await supabase
    .from("offers")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) {
    console.error("[offers] delete failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateOffers(profile.slug);
  return { ok: true };
}

export async function duplicateOffer(id: string): Promise<ActionResult<{ id: string }>> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { data: source } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single();

  if (!source) return { ok: false, error: "not_found" };

  const { data, error } = await supabase
    .from("offers")
    .insert({
      profile_id: profile.id,
      title: `${source.title} (copy)`,
      description: source.description,
      price: source.price,
      price_type: source.price_type,
      main_photo_url: source.main_photo_url,
      action_type: source.action_type,
      action_config: source.action_config,
      custom_fields: source.custom_fields,
      position: source.position + 1,
      is_active: false,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "unexpected" };

  revalidateOffers(profile.slug);
  return { ok: true, data: { id: data.id } };
}

/** Drag-and-drop reordering: positions follow the order of the given ids. */
export async function reorderOffers(orderedIds: string[]): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { data: owned } = await supabase.from("offers").select("id").eq("profile_id", profile.id);
  const ownedIds = new Set((owned ?? []).map((offer) => offer.id));
  const ids = orderedIds.filter((id) => ownedIds.has(id));

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("offers").update({ position: index }).eq("id", id).eq("profile_id", profile.id),
    ),
  );

  if (results.some((result) => result.error)) {
    return { ok: false, error: "unexpected" };
  }

  revalidateOffers(profile.slug);
  return { ok: true };
}
