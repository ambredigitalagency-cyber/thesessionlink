"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";

import {
  sendBookingConfirmationToClient,
  sendBookingNotificationToPro,
  sendClientCancellationToPro,
} from "@/lib/emails/send";
import { onlinePaymentFor, parseActionConfig } from "@/lib/offers/schema";
import { chargeableAmount, offerIsPayable } from "@/lib/payments/amount";
import { payableProvidersAsAdmin } from "@/lib/payments/accounts";
import { startCheckout } from "@/lib/payments/checkout";
import { decideCheckout } from "@/lib/payments/decide";
import { CHECKOUT_HOLD_MINUTES, type PaymentProvider } from "@/lib/payments/config";
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
  /** Set when the client must be sent to a gateway to finish paying. */
  redirectUrl?: string;
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

  const checkout = await resolveCheckout(offer, profile, values);
  if ("error" in checkout) return { ok: false, error: checkout.error };

  if (checkout.provider) {
    // Insert the booking *before* sending the client to the gateway: it holds
    // the slot for the length of the checkout, so nobody can take it while
    // they are typing their card in. payment_due_at is what releases it again
    // if they never come back — see expire_unpaid_bookings().
    booking.payment_status = "pending";
    booking.payment_amount_cents = checkout.amountCents;
    booking.payment_currency = checkout.currency;
    booking.payment_provider = checkout.provider;
    booking.payment_due_at = new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60_000).toISOString();
    // Nothing is confirmed until the money lands, whatever the offer says.
    booking.status = "pending";
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

  if (checkout.provider) {
    const opened = await startCheckout({
      bookingId: created.id,
      profileId: profile.id,
      offerId: offer.id,
      provider: checkout.provider,
      amountCents: checkout.amountCents,
      currency: checkout.currency,
      description: offer.title,
      clientEmail: values.client_email,
      manageToken: created.manage_token,
      locale: values.locale,
    });

    if (!opened.ok) {
      // The gateway refused before the client ever saw it. Take the slot back
      // rather than leave a booking nobody can pay.
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "client",
          payment_status: "failed",
          payment_due_at: null,
        })
        .eq("id", created.id);

      return { ok: false, error: opened.error };
    }

    // No email yet: a booking that is not paid for is not news worth sending.
    // settlePayment() sends the pair once the money lands.
    revalidatePath("/dashboard", "layout");

    return {
      ok: true,
      data: {
        manageToken: created.manage_token,
        status: created.status,
        startsAt: created.starts_at,
        endsAt: created.ends_at,
        redirectUrl: opened.redirectUrl,
      },
    };
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

/**
 * Whether this booking has to be paid now, and with what.
 *
 * The rule itself lives in decideCheckout(), pure and unit-tested; this only
 * gathers what it needs. The client's request chooses between the options they
 * were legitimately offered — it never decides whether payment applies.
 */
async function resolveCheckout(
  offer: Tables<"offers">,
  profile: Tables<"profiles">,
  values: { payment_choice?: "stripe" | "paypal" | "on_site" | null; quantity: number },
): Promise<
  { provider: PaymentProvider | null; amountCents: number; currency: string } | { error: string }
> {
  const config = parseActionConfig(offer.action_type, offer.action_config);
  const mode = onlinePaymentFor(offer.action_type, config);
  const currency = profile.currency ?? "EUR";
  const nothing = { provider: null, amountCents: 0, currency };

  if (mode === "off") return nothing;

  const amountCents = chargeableAmount(offer, currency, values.quantity);
  const decision = decideCheckout({
    mode,
    payable: offerIsPayable(offer) && amountCents !== null && amountCents > 0,
    available: await payableProvidersAsAdmin(profile.id),
    choice: values.payment_choice,
  });

  if (decision.kind === "refused") return { error: decision.error };
  if (decision.kind === "none" || amountCents === null) return nothing;

  return { provider: decision.provider, amountCents, currency };
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
