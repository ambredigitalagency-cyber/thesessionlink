"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfileForAction } from "@/lib/auth";
import { offerFieldsSchema } from "@/lib/offers/fields";
import {
  MAX_BLOCKS,
  MEDIA_PATH,
  defaultConfig,
  isBlockType,
  validateBlock,
  type BlockType,
} from "@/lib/page/blocks";
import { THEME_IDS, normalizeHex } from "@/lib/page/themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { fieldErrorsFrom, slugSchema, type ActionResult } from "@/lib/validation";

/**
 * Everything the "My page" editor writes.
 *
 * Each action re-reads the signed-in coach and writes through their own
 * session, so the row-level policies decide what they may touch; on top of
 * that every block config is validated here, whatever the editor sent.
 */

const idSchema = z.uuid();

export type EditorBlock = {
  id: string;
  type: BlockType;
  config: Record<string, unknown>;
  visible: boolean;
  offer_id: string | null;
  /** Still to complete: the coach sees it, visitors do not, until confirmBlock. */
  pending: boolean;
  /** Added by the sign-up for the trade: what the "to complete" list counts. */
  suggested: boolean;
};

function revalidatePage(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath("/dashboard/page");
}

/** Every uploaded image or file must sit in the coach's own storage folder. */
function ownsMedia(config: unknown, userId: string): boolean {
  const urls: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string" && value.includes(MEDIA_PATH)) urls.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(config);
  return urls.every((url) => url.split(MEDIA_PATH)[1]?.startsWith(`${userId}/`));
}

export async function addBlock(input: {
  type: string;
  offerId?: string | null;
}): Promise<ActionResult<EditorBlock>> {
  const profile = await requireProfileForAction();
  if (!isBlockType(input.type)) return { ok: false, error: "invalid_input" };
  const type = input.type;

  const offerId = type === "service" ? input.offerId : null;
  if (type === "service" && !idSchema.safeParse(offerId).success) {
    return { ok: false, error: "invalid_input" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("page_blocks")
    .select("position")
    .eq("profile_id", profile.id)
    .order("position", { ascending: false });
  if ((rows?.length ?? 0) >= MAX_BLOCKS) return { ok: false, error: "block_limit" };

  const config = defaultConfig(type, {
    phone: profile.phone_number,
    whatsapp: profile.whatsapp_number,
    email: profile.contact_email,
  });

  const { data, error } = await supabase
    .from("page_blocks")
    .insert({
      profile_id: profile.id,
      type,
      offer_id: offerId ?? null,
      config: config as Json,
      position: (rows?.[0]?.position ?? -1) + 1,
    })
    .select("id, type, config, visible, offer_id, pending, suggested")
    .single();

  if (error || !data) {
    if (error?.message?.includes("block_limit")) return { ok: false, error: "block_limit" };
    console.error("[page] add block failed", error?.code, error?.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePage(profile.slug);
  return { ok: true, data: data as EditorBlock };
}

/**
 * Saves a block as the coach types.
 *
 * A config that validates is stored normalised. One that does not yet — a
 * link with half a URL — is still kept as a draft, so nothing typed is lost;
 * the public page only ever renders configs that validate (parseBlocks), so a
 * draft never reaches a visitor. The errors go back for the editor to show.
 */
export async function updateBlock(
  id: string,
  config: unknown,
): Promise<ActionResult<{ complete: boolean; errors: Record<string, string>; config: unknown }>> {
  const profile = await requireProfileForAction();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "invalid_input" };
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, error: "invalid_input" };
  }
  if (JSON.stringify(config).length > 12_000) return { ok: false, error: "too_long" };

  const supabase = await createSupabaseServerClient();
  const { data: block } = await supabase
    .from("page_blocks")
    .select("type")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!block || !isBlockType(block.type)) return { ok: false, error: "not_found" };

  if (!ownsMedia(config, profile.user_id)) return { ok: false, error: "invalid_input" };

  const result = validateBlock(block.type, config);
  const stored = result.ok ? result.config : config;

  const { error } = await supabase
    .from("page_blocks")
    .update({ config: stored as Json })
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) {
    console.error("[page] update block failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePage(profile.slug);
  return {
    ok: true,
    data: { complete: result.ok, errors: result.ok ? {} : result.errors, config: stored },
  };
}

/**
 * A block added at sign-up "to complete" goes public only here: once the
 * coach has filled it in and says it is ready. Its config must validate —
 * an empty review or a price list without prices never reaches a visitor.
 */
export async function confirmBlock(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { data: block } = await supabase
    .from("page_blocks")
    .select("type, config")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!block || !isBlockType(block.type)) return { ok: false, error: "not_found" };
  if (!validateBlock(block.type, block.config).ok) return { ok: false, error: "invalid_input" };

  const { error } = await supabase
    .from("page_blocks")
    .update({ pending: false })
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) return { ok: false, error: "unexpected" };

  revalidatePage(profile.slug);
  return { ok: true };
}

export async function setBlockVisible(id: string, visible: boolean): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("page_blocks")
    .update({ visible: Boolean(visible) })
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) return { ok: false, error: "unexpected" };

  revalidatePage(profile.slug);
  return { ok: true };
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("page_blocks")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) return { ok: false, error: "unexpected" };

  revalidatePage(profile.slug);
  return { ok: true };
}

export async function reorderBlocks(orderedIds: string[]): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = z.array(idSchema).max(MAX_BLOCKS).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(
    parsed.data.map((id, position) =>
      supabase.from("page_blocks").update({ position }).eq("id", id).eq("profile_id", profile.id),
    ),
  );
  if (results.some((result) => result.error)) return { ok: false, error: "unexpected" };

  revalidatePage(profile.slug);
  return { ok: true };
}

const appearanceSchema = z.object({
  theme: z.enum(THEME_IDS),
  accent: z
    .string()
    .transform((value) => normalizeHex(value))
    .refine((value) => value !== null, "invalid_input"),
});

export async function updateAppearance(input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ theme: parsed.data.theme, accent_color: parsed.data.accent as string })
    .eq("id", profile.id);
  if (error) return { ok: false, error: "unexpected" };

  revalidatePage(profile.slug);
  return { ok: true };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .nullish()
    .transform((value) => (value ? value : null));

/** The profile panel: what sits at the top of the page. Saved as typed. */
const pageProfileSchema = z.object({
  display_name: z.string().trim().min(2, "too_short").max(80),
  headline: optionalText(120),
  bio: optionalText(1200),
  location: optionalText(120),
  avatar_url: optionalText(500),
  category_id: z
    .uuid()
    .nullish()
    .transform((value) => value ?? null),
  custom_fields: offerFieldsSchema.default([]),
});

export async function updatePageProfile(input: unknown): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = pageProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  if (parsed.data.avatar_url && !ownsMedia(parsed.data.avatar_url, profile.user_id)) {
    return { ok: false, error: "invalid_input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, custom_fields: parsed.data.custom_fields as Json })
    .eq("id", profile.id);
  if (error) {
    console.error("[page] profile update failed", error.code, error.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePage(profile.slug);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Changing the link breaks every copy already shared, so it is its own, explicit action. */
export async function updateSlug(input: string): Promise<ActionResult<{ slug: string }>> {
  const profile = await requireProfileForAction();
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      fieldErrors: { slug: parsed.error.issues[0]?.message ?? "invalid_slug" },
    };
  }
  if (parsed.data === profile.slug) return { ok: true, data: { slug: profile.slug } };

  const supabase = await createSupabaseServerClient();
  const { data: available } = await supabase.rpc("is_slug_available", { p_slug: parsed.data });
  if (available !== true) {
    return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ slug: parsed.data })
    .eq("id", profile.id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "slug_taken", fieldErrors: { slug: "slug_taken" } };
    }
    return { ok: false, error: "unexpected" };
  }

  revalidatePath(`/${profile.slug}`);
  revalidatePage(parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: { slug: parsed.data } };
}
