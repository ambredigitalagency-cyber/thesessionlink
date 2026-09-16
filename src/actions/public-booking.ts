"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";

import {
  sendBookingConfirmationToClient,
  sendBookingNotificationToPro,
  sendClientCancellationToPro,
} from "@/lib/emails/send";
import { parseActionConfig } from "@/lib/offers/schema";
import { clampWindow, getBookingContext, slotInputFrom } from "@/lib/public/booking-context";
import { isSlotBookable } from "@/lib/scheduling/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { fieldErrorsFrom, publicBookingSchema, type ActionResult } from "@/lib/validation";

type BookingSuccess = {
  manageToken: string;
  status: Tables<"bookings">["status"];
  startsAt: string | null;
  endsAt: string | null;
};

async function rateLimit(bucket: string, limit: number, window: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window: window,
  });
  // Fail open on infrastructure errors: never block a real booking.
  return error ? true : data !== false;
}

/**
 * Creates a booking / request from a public profile.
 *
 * Runs with the service key because anonymous visitors have no write access:
 * every rule (slot validity, capacity, visibility) is enforced here and backed
 * by database constraints (no-overlap exclusion, capacity trigger).
 */
export async function createPublicBooking(input: unknown): Promise<ActionResult<BookingSuccess>> {
  const parsed = publicBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const values = parsed.data;
  if (values.company) {
    // Honeypot filled: pretend everything is fine, store nothing.
    return { ok: false, error: "invalid_input" };
  }

  const window = clampWindow(new Date(), new Date(Date.now() + 24 * 3600_000));
  const context = await getBookingContext(values.offer_id, window);
  if (!context) return { ok: false, error: "offer_unavailable" };

  const { offer, profile } = context;

  if (offer.action_type === "whatsapp_direct") {
    return { ok: false, error: "offer_unavailable" };
  }

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";

  const [emailAllowed, ipAllowed] = await Promise.all([
    rateLimit(`booking:${profile.id}:${values.client_email}`, 5, "01:00:00"),
    rateLimit(`booking_ip:${ip}`, 20, "01:00:00"),
  ]);

  if (!emailAllowed || !ipAllowed) {
    return { ok: false, error: "too_many_requests" };
  }

  const booking: TablesInsert<"bookings"> = {
    profile_id: profile.id,
    offer_id: offer.id,
    action_type: offer.action_type,
    offer_title: offer.title,
    client_name: values.client_name,
    client_email: values.client_email,
    client_phone: values.client_phone,
    client_message: values.message,
    client_timezone: values.client_timezone,
    locale: values.locale,
    status: "pending",
  };

  if (offer.action_type === "calendar_booking") {
    if (!profile.calendar_visible) return { ok: false, error: "calendar_closed" };
    if (!values.start) return { ok: false, error: "slot_required" };

    const start = new Date(values.start);
    const slot = isSlotBookable(slotInputFrom(context, window), start);
    if (!slot) return { ok: false, error: "slot_unavailable" };

    const config = parseActionConfig("calendar_booking", offer.action_config);
    booking.starts_at = slot.start.toISOString();
    booking.ends_at = slot.end.toISOString();
    booking.status = config.requires_confirmation ? "pending" : "confirmed";
  }

  if (offer.action_type === "direct_reservation") {
    const config = parseActionConfig("direct_reservation", offer.action_config);

    if (config.date_mode === "required" && !values.requested_date) {
      return { ok: false, error: "date_required", fieldErrors: { requested_date: "required" } };
    }
    if (values.quantity > config.max_quantity_per_booking) {
      return { ok: false, error: "quantity_too_high" };
    }

    booking.requested_date = config.date_mode === "none" ? null : (values.requested_date ?? null);
    booking.quantity = values.quantity;
    booking.status = config.requires_confirmation ? "pending" : "confirmed";
  }

  if (offer.action_type === "quote_request") {
    const config = parseActionConfig("quote_request", offer.action_config);
    booking.requested_date = config.ask_preferred_date ? (values.requested_date ?? null) : null;
    booking.details = values.budget ? { budget: values.budget } : {};
  }

  const supabase = createSupabaseAdminClient();
  const { data: created, error } = await supabase
    .from("bookings")
    .insert(booking)
    .select("*")
    .single();

  if (error || !created) {
    if (error?.code === "23P01") return { ok: false, error: "slot_unavailable" };
    if (error?.message?.includes("capacity_exceeded")) return { ok: false, error: "sold_out" };
    console.error("[booking] insert failed", error);
    return { ok: false, error: "unexpected" };
  }

  after(async () => {
    await sendBookingConfirmationToClient({ booking: created, profile });

    if (profile.notify_new_bookings) {
      const proEmail = await resolveProEmail(profile);
      if (proEmail) {
        await sendBookingNotificationToPro({ booking: created, profile, to: proEmail });
      }
    }
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${profile.slug}`);

  return {
    ok: true,
    data: {
      manageToken: created.manage_token,
      status: created.status,
      startsAt: created.starts_at,
      endsAt: created.ends_at,
    },
  };
}

async function resolveProEmail(profile: Tables<"profiles">) {
  if (profile.contact_email) return profile.contact_email;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.auth.admin.getUserById(profile.user_id);
  return data.user?.email ?? null;
}

/** Client-side cancellation from the link in their confirmation email. */
export async function cancelBookingByToken(token: string): Promise<ActionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();

  if (!booking) return { ok: false, error: "not_found" };
  if (booking.status === "cancelled") return { ok: true };

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "client",
    })
    .eq("id", booking.id)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("[booking] cancel failed", error);
    return { ok: false, error: "unexpected" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", booking.profile_id)
    .single();

  if (profile) {
    after(async () => {
      const proEmail = await resolveProEmail(profile);
      if (proEmail) {
        await sendClientCancellationToPro({ booking: updated, profile, to: proEmail });
      }
    });

    revalidatePath(`/${profile.slug}`);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
