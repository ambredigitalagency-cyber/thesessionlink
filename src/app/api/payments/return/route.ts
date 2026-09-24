import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "@/lib/env";
import { capturePaypalOrder } from "@/lib/payments/paypal";
import { settlePayment } from "@/lib/payments/settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Where a client lands on their way back from a gateway.
 *
 * Two things happen here, and neither of them believes the URL:
 *
 *   * For PayPal, the order is captured — server to server. An approved order
 *     is not a paid one, and this is the call that moves the money.
 *   * For Stripe, nothing: the webhook is the only thing that settles a
 *     Checkout Session. The client is simply sent on to their booking, which
 *     will show "paid" as soon as the webhook lands.
 *
 * The `ref` is our own payment id. Someone hitting this route with a made-up
 * one gets a redirect and nothing else: every state change goes through
 * settlePayment(), which only believes the provider.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("ref");
  const home = absoluteUrl("/", siteUrl);

  if (!reference) return NextResponse.redirect(home);

  const supabase = createSupabaseAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, provider, external_id, status, booking_id")
    .eq("id", reference)
    .maybeSingle();

  if (!payment) return NextResponse.redirect(home);

  const { data: booking } = payment.booking_id
    ? await supabase
        .from("bookings")
        .select("manage_token")
        .eq("id", payment.booking_id)
        .maybeSingle()
    : { data: null };

  const destination = booking ? absoluteUrl(`/booking/${booking.manage_token}`, siteUrl) : home;

  if (payment.provider === "paypal" && payment.external_id && payment.status === "pending") {
    const outcome = await capturePaypalOrder(payment.external_id);
    if (outcome) await settlePayment(outcome);
  }

  return NextResponse.redirect(`${destination}?payment=done`);
}
