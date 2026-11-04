"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfileForAction } from "@/lib/auth";
import { MAX_SOURCES, SOURCE_PRESETS, type SourceKind } from "@/lib/tracking/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";

export type TrackingSource = {
  id: string;
  slug: string;
  label: string;
  kind: SourceKind;
};

const kindSchema = z.enum(
  SOURCE_PRESETS.map((preset) => preset.kind) as [SourceKind, ...SourceKind[]],
);

/**
 * Creates a named source. A preset needs nothing typed — its label is the
 * platform's name and its slug the one people will see in the link
 * (instagram, qr-flyer…). "Other" takes a label and makes its slug from it.
 * A slug already taken by this page gets -2, -3….
 */
export async function createSource(input: {
  kind: string;
  label: string;
}): Promise<ActionResult<TrackingSource>> {
  const profile = await requireProfileForAction();
  const kind = kindSchema.safeParse(input.kind);
  const label = z.string().trim().min(1).max(40).safeParse(input.label);
  if (!kind.success || !label.success) {
    return { ok: false, error: "invalid_input", fieldErrors: { label: "required" } };
  }

  const preset = SOURCE_PRESETS.find((item) => item.kind === kind.data)!;
  const base = (preset.slug || slugify(label.data)).slice(0, 26).replace(/-+$/, "") || "lien";

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("tracking_sources")
    .select("slug")
    .eq("profile_id", profile.id);
  if ((existing?.length ?? 0) >= MAX_SOURCES) return { ok: false, error: "source_limit" };

  const taken = new Set((existing ?? []).map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const { data, error } = await supabase
    .from("tracking_sources")
    .insert({ profile_id: profile.id, slug, label: label.data, kind: kind.data })
    .select("id, slug, label, kind")
    .single();
  if (error || !data) {
    if (error?.message?.includes("source_limit")) return { ok: false, error: "source_limit" };
    console.error("[tracking] create source failed", error?.code, error?.message);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath("/dashboard/stats", "layout");
  return { ok: true, data: data as TrackingSource };
}

export async function deleteSource(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tracking_sources")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  if (error) return { ok: false, error: "unexpected" };

  revalidatePath("/dashboard/stats", "layout");
  return { ok: true };
}
