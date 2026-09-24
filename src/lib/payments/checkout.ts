import "server-only";

import { siteUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/utils";

import { accountFor } from "./accounts";
import type { PaymentProvider } from "./config";
import { createPaypalOrder } from "./paypal";
import { createStripeCheckout } from "./stripe";
import type { CheckoutResult } from "./types";

/**
 * Opening a checkout for a booking that is waiting to be paid.
 *
 * The row in `payments` is created first, and its id is what travels to the
 * provider as the reference. So whatever comes back — a webhook minutes later,
 * a capture on the return trip, a duplicate of either — lands on a row that
 * already exists, with an amount already decided here rather than read from
 * the answer.
 */

export type StartCheckoutArgs = {
  bookingId: string;
  profileId: string;
  offerId: string | null;
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  description: string;
  clientEmail: string;
  manageToken: string;
  locale: string;
};

export async function startCheckout(args: StartCheckoutArgs): Promise<CheckoutResult> {
  const account = await accountFor(args.profileId, args.provider);
  if (!account || account.status !== "connected" || !account.charges_enabled) {
    return { ok: false, error: "gateway_unavailable" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      booking_id: args.bookingId,
      profile_id: args.profileId,
      offer_id: args.offerId,
      provider: args.provider,
      amount_cents: args.amountCents,
      currency: args.currency.toUpperCase(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !payment) {
    console.error("[payments] could not open a payment", error?.code, error?.message);
    return { ok: false, error: "unexpected" };
  }

  const manage = absoluteUrl(`/booking/${args.manageToken}`, siteUrl);
  // The return trip goes through our own server first: PayPal hands back an
  // approved order that still has to be captured, and no client-side "success"
  // is ever allowed to be the thing that marks a booking paid.
  const request = {
    account,
    reference: payment.id,
    amountCents: args.amountCents,
    currency: args.currency.toUpperCase(),
    description: args.description,
    clientEmail: args.clientEmail,
    returnUrl: absoluteUrl(`/api/payments/return?ref=${payment.id}`, siteUrl),
    cancelUrl: `${manage}?payment=cancelled`,
    locale: args.locale,
  };

  const result =
    args.provider === "stripe"
      ? await createStripeCheckout(request)
      : await createPaypalOrder(request);

  if (!result.ok) {
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: result.error })
      .eq("id", payment.id);
    return result;
  }

  // Storing the provider's id is what lets a webhook find this row again.
  await supabase.from("payments").update({ external_id: result.externalId }).eq("id", payment.id);

  return result;
}
