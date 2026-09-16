"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireProfileForAction } from "@/lib/auth";
import { sendBookingStatusUpdate } from "@/lib/emails/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation";

const notesSchema = z.string().trim().max(10000).nullish();

/** Pro confirms or cancels a request; the client is notified by email. */
export async function updateBookingStatus(
  id: string,
  status: "pending" | "confirmed" | "cancelled",
): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status,
      cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
      cancelled_by: status === "cancelled" ? "pro" : null,
    })
    .eq("id", id)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !booking) {
    // The exclusion constraint can reject re-confirming a slot taken meanwhile.
    if (error?.code === "23P01") return { ok: false, error: "slot_taken" };
    console.error("[bookings] status update failed", error);
    return { ok: false, error: "unexpected" };
  }

  if (status !== "pending") {
    after(async () => {
      await sendBookingStatusUpdate({ booking, profile });
    });
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveBookingNotes(id: string, notes: string | null): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ internal_notes: parsed.data || null })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveClientNotes(
  clientId: string,
  notes: string | null,
): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ notes: parsed.data || null })
    .eq("id", clientId)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateClientDetails(
  clientId: string,
  input: { name: string; phone: string | null },
): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(30).nullish(),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ name: parsed.data.name, phone: parsed.data.phone || null })
    .eq("id", clientId)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteBooking(id: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { ok: false, error: "unexpected" };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
