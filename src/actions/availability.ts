"use server";

import { revalidatePath } from "next/cache";

import { requireProfileForAction } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  timeOffSchema,
  weeklyScheduleSchema,
  type ActionResult,
} from "@/lib/validation";

function revalidateSchedule(slug: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${slug}`);
}

/**
 * Replaces the weekly schedule in one transaction.
 * offer_id = null is the default schedule shared by every calendar offer.
 */
export async function saveWeeklySchedule(input: {
  offer_id?: string | null;
  rules: { weekday: number; start_time: string; end_time: string }[];
}): Promise<ActionResult> {
  const profile = await requireProfileForAction();

  const parsed = weeklyScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const overlapping = hasOverlap(parsed.data.rules);
  if (overlapping) return { ok: false, error: "overlapping_rules" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("replace_weekly_availability", {
    // Generated types mark the argument as non-null; null is the "default
    // schedule for every calendar offer" case and is valid in SQL.
    p_offer_id: parsed.data.offer_id as string,
    p_rules: parsed.data.rules,
  });

  if (error) {
    console.error("[availability] save failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateSchedule(profile.slug);
  return { ok: true };
}

function hasOverlap(rules: { weekday: number; start_time: string; end_time: string }[]) {
  const byDay = new Map<number, { start: string; end: string }[]>();

  for (const rule of rules) {
    const list = byDay.get(rule.weekday) ?? [];
    if (list.some((other) => rule.start_time < other.end && other.start < rule.end_time)) {
      return true;
    }
    list.push({ start: rule.start_time, end: rule.end_time });
    byDay.set(rule.weekday, list);
  }

  return false;
}

export async function addTimeOff(input: {
  starts_on: string;
  ends_on: string;
  label?: string | null;
}): Promise<ActionResult> {
  const profile = await requireProfileForAction();

  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("time_off").insert({
    profile_id: profile.id,
    starts_on: parsed.data.starts_on,
    ends_on: parsed.data.ends_on,
    label: parsed.data.label,
  });

  if (error) {
    console.error("[availability] time off failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidateSchedule(profile.slug);
  return { ok: true };
}

export async function deleteTimeOff(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("time_off")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidateSchedule(profile.slug);
  return { ok: true };
}
