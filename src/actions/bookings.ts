"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireProfileForAction } from "@/lib/auth";
import { sendBookingStatusUpdate } from "@/lib/emails/send";
import { clampWindow, getBookingContext, slotInputFrom } from "@/lib/public/booking-context";
import { isSlotBookable, withoutMinimumNotice } from "@/lib/scheduling/slots";
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

/**
 * Moves a confirmed or pending session to another slot, from the calendar.
 *
 * Re-runs the exact validation a public booking goes through — same context,
 * same slot engine — so availability rules, the buffer between sessions, time
 * off and the minimum notice all still apply. The no-overlap exclusion
 * constraint in Postgres is the backstop if something is booked in between.
 */
export async function rescheduleBooking(id: string, startsAt: string): Promise<ActionResult> {
  const profile = await requireProfileForAction();
  const supabase = await createSupabaseServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, offer_id, action_type, status, starts_at, ends_at")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!booking) return { ok: false, error: "not_found" };
  if (booking.action_type !== "calendar_booking" || !booking.offer_id) {
    return { ok: false, error: "not_available" };
  }
  if (booking.status === "cancelled") return { ok: false, error: "not_available" };

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "invalid_input" };

  const window = clampWindow(
    new Date(start.getTime() - 24 * 3600_000),
    new Date(start.getTime() + 24 * 3600_000),
  );
  const context = await getBookingContext(booking.offer_id, window);
  if (!context) return { ok: false, error: "offer_unavailable" };

  // The booking being moved must not block itself. The exclusion constraint
  // guarantees at most one non-cancelled booking occupies a given range, so
  // matching on its own bounds is unambiguous.
  const own = booking.starts_at ? new Date(booking.starts_at).getTime() : null;
  const context_ = {
    ...context,
    busy: context.busy.filter((range) => range.start.getTime() !== own),
  };

  // The pro is not held to the notice they ask of their clients; the buffer
  // between sessions still is.
  const slot = isSlotBookable(withoutMinimumNotice(slotInputFrom(context_, window)), start);
  if (!slot) return { ok: false, error: "slot_unavailable" };

  const { error } = await supabase
    .from("bookings")
    .update({ starts_at: slot.start.toISOString(), ends_at: slot.end.toISOString() })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) {
    if (error.code === "23P01") return { ok: false, error: "slot_taken" };
    console.error("[bookings] reschedule failed", error);
    return { ok: false, error: "unexpected" };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${profile.slug}`);
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
