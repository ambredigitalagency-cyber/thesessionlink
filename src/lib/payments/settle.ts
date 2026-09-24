import "server-only";

import { after } from "next/server";

import { sendBookingConfirmationToClient, sendBookingNotificationToPro } from "@/lib/emails/send";
import { onlinePaymentFor, parseActionConfig, requiresConfirmation } from "@/lib/offers/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types";

import type { ProviderOutcome } from "./types";

/**
 * Applying what a provider told us to our own rows.
 *
 * Every path that learns something about a payment ends here: the Stripe
 * webhook, the PayPal webhook, and the PayPal return trip that captures the
 * order. They can arrive in any order, more than once, and years apart from
 * each other — so this function is written to be safe when called twice with
 * the same news, and to refuse to un-do a later truth with an earlier one.
 *
 * It is the only place allowed to move a booking to "paid". A client coming
 * back from a provider with a success in the URL changes nothing here; only a
 * signed webhook or a server-to-server capture does.
 *
 * NOT HERE YET — refunds. Taking money and giving it back are different
 * problems, and only the first one is solved. A refund step would need:
 *
 *   * a "Rembourser" action on the booking, calling POST /v1/refunds on the
 *     connected account (Stripe) and /v2/payments/captures/{id}/refund
 *     (PayPal), both of which need the capture_id this file already stores;
 *   * partial amounts, since a late cancellation is often refunded in part,
 *     which means a refunded_cents column rather than a status flip;
 *   * a policy the coach sets per offer (full / partial / none, and until
 *     when), because the button is only as useful as the rule behind it;
 *   * the refund webhooks — charge.refunded and PAYMENT.CAPTURE.REFUNDED —
 *     landing here, since a coach can also refund from their own dashboard and
 *     we would otherwise keep showing the booking as paid. The PayPal event is
 *     already reduced by paypalOutcome(); it is deliberately mapped to
 *     "failed" for now rather than silently ignored.
 */

type SettleResult = { applied: boolean; reason?: string };

export async function settlePayment(outcome: ProviderOutcome): Promise<SettleResult> {
  const supabase = createSupabaseAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("provider", outcome.provider)
    .eq("external_id", outcome.externalId)
    .maybeSingle();

  if (!payment) return { applied: false, reason: "unknown_payment" };

  // Already settled: a duplicate delivery, or the other of the two paths that
  // watch a PayPal order. Nothing to do, and certainly nothing to reopen.
  if (payment.status === "paid") return { applied: false, reason: "already_paid" };
  if (payment.status === outcome.status) return { applied: false, reason: "already_applied" };

  const paid = outcome.status === "paid";

  // An amount that does not match what we asked for is not a payment we can
  // accept silently: record it, but never confirm the booking on it.
  const amountMatches =
    outcome.amountCents === null ||
    outcome.amountCents === undefined ||
    outcome.amountCents === payment.amount_cents;

  if (paid && !amountMatches) {
    console.error(
      "[payments] amount mismatch",
      payment.id,
      "expected",
      payment.amount_cents,
      "got",
      outcome.amountCents,
    );
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: "amount_mismatch" })
      .eq("id", payment.id);
    return { applied: false, reason: "amount_mismatch" };
  }

  await supabase
    .from("payments")
    .update({
      status: outcome.status,
      capture_id: outcome.captureId ?? payment.capture_id,
      failure_reason: outcome.failureReason ?? null,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", payment.id);

  if (!payment.booking_id) return { applied: true, reason: "no_booking" };

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .maybeSingle();

  if (!booking) return { applied: true, reason: "booking_gone" };

  return paid ? confirmPaidBooking(booking, payment) : releaseUnpaidBooking(booking);
}

/* -------------------------------------------------------------------------- */

async function confirmPaidBooking(
  booking: Tables<"bookings">,
  payment: Tables<"payments">,
): Promise<SettleResult> {
  const supabase = createSupabaseAdminClient();

  const update: TablesUpdate<"bookings"> = {
    payment_status: "paid",
    payment_provider: payment.provider,
    payment_amount_cents: payment.amount_cents,
    payment_currency: payment.currency,
    payment_due_at: null,
  };

  // The coach may have cancelled while the client was paying. Record the money
  // — it is real — but do not bring the booking back to life.
  const cancelled = booking.status === "cancelled";

  const { data: offer } = booking.offer_id
    ? await supabase
        .from("offers")
        .select("action_type, action_config")
        .eq("id", booking.offer_id)
        .maybeSingle()
    : { data: null };

  // Payment answers "is it paid", not "does the coach still have to accept it".
  // An offer that asks for confirmation keeps asking for it once paid.
  const config = offer ? parseActionConfig(offer.action_type, offer.action_config) : null;
  const stillNeedsPro = config && offer ? requiresConfirmation(offer.action_type, config) : true;

  if (!cancelled) {
    update.status = stillNeedsPro ? "pending" : "confirmed";
  }

  const { data: updated } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", booking.id)
    .select("*")
    .single();

  if (!updated || cancelled) return { applied: true, reason: cancelled ? "cancelled" : undefined };

  // The client heard nothing when they booked — a booking that required
  // payment holds its emails until the money lands. This is that moment.
  const withheld = booking.payment_status === "pending";
  if (withheld) await notify(updated);

  return { applied: true };
}

async function releaseUnpaidBooking(booking: Tables<"bookings">): Promise<SettleResult> {
  const supabase = createSupabaseAdminClient();

  const { data: offer } = booking.offer_id
    ? await supabase
        .from("offers")
        .select("action_type, action_config")
        .eq("id", booking.offer_id)
        .maybeSingle()
    : { data: null };

  const mode = offer
    ? onlinePaymentFor(offer.action_type, parseActionConfig(offer.action_type, offer.action_config))
    : "required";

  // When paying was the condition of the booking, a failed payment ends it.
  // When it was optional, the booking stands and simply is not paid.
  if (mode === "required" && booking.status !== "cancelled") {
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "client",
        payment_status: "failed",
        payment_due_at: null,
      })
      .eq("id", booking.id);
    return { applied: true, reason: "booking_cancelled" };
  }

  await supabase
    .from("bookings")
    .update({ payment_status: "failed", payment_due_at: null })
    .eq("id", booking.id);

  return { applied: true };
}

/** The confirmation pair that a paid booking finally earns. */
async function notify(booking: Tables<"bookings">) {
  const supabase = createSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", booking.profile_id)
    .maybeSingle();

  if (!profile) return;

  after(async () => {
    await sendBookingConfirmationToClient({ booking, profile });

    if (profile.notify_new_bookings) {
      const to =
        profile.contact_email ??
        (await supabase.auth.admin.getUserById(profile.user_id)).data.user?.email ??
        null;
      if (to) await sendBookingNotificationToPro({ booking, profile, to });
    }
  });
}
