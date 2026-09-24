import { NextResponse, type NextRequest } from "next/server";

import { disconnectAccount, saveConnectedAccount } from "@/lib/payments/accounts";
import { paypalEnv } from "@/lib/payments/config";
import {
  capturePaypalOrder,
  paypalApprovedOrder,
  paypalMerchantEvent,
  paypalOutcome,
  paypalSellerFacts,
  verifyPaypalSignature,
} from "@/lib/payments/paypal";
import { settlePayment } from "@/lib/payments/settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * PayPal's word on what happened.
 *
 * Verification is a round trip to PayPal rather than a local HMAC, so it can
 * fail for reasons that have nothing to do with the sender. It is still
 * treated as a refusal: an unverified event is one we cannot tell apart from a
 * forged one, and PayPal will redeliver.
 */
export async function POST(request: NextRequest) {
  if (!paypalEnv.webhookId) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const payload = await request.text();

  if (!(await verifyPaypalSignature(request.headers, payload))) {
    console.error("[paypal] rejected an unverified webhook");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // The coach finished — or undid — their onboarding.
  const merchant = paypalMerchantEvent(event);
  if (merchant) return handleMerchantEvent(merchant);

  // An order was approved and is waiting to be captured. Doing it here as well
  // as on the return trip is what makes the payment survive a closed tab.
  const approved = paypalApprovedOrder(event);
  if (approved) return captureApproved(approved);

  const outcome = paypalOutcome(event);
  if (!outcome) return NextResponse.json({ received: true, ignored: true });

  const result = await settlePayment(outcome);
  return NextResponse.json({ received: true, ...result });
}

/* -------------------------------------------------------------------------- */

async function handleMerchantEvent(merchant: { trackingRef: string; revoked: boolean }) {
  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from("payment_accounts")
    .select("profile_id")
    .eq("onboarding_ref", merchant.trackingRef)
    .eq("provider", "paypal")
    .maybeSingle();

  if (!row) return NextResponse.json({ received: true, ignored: true });

  if (merchant.revoked) {
    // The coach withdrew our permission from their own PayPal account. Saying
    // so plainly matters: leaving the row "connected" would keep offering
    // PayPal to their clients, and every order would fail at the till.
    await disconnectAccount(row.profile_id, "paypal");
    return NextResponse.json({ received: true, disconnected: true });
  }

  const facts = await paypalSellerFacts(merchant.trackingRef);
  if (facts) {
    await saveConnectedAccount(row.profile_id, "paypal", facts);
    return NextResponse.json({ received: true, connected: facts.chargesEnabled });
  }

  // PayPal announced the onboarding but will not tell us about the seller yet.
  // Leave the row pending rather than claim a connection we cannot describe.
  return NextResponse.json({ received: true, pending: true });
}

async function captureApproved(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("provider", "paypal")
    .eq("external_id", orderId)
    .maybeSingle();

  if (!payment) return NextResponse.json({ received: true, ignored: true });
  // Already settled, most likely by the return trip a second earlier.
  if (payment.status !== "pending") {
    return NextResponse.json({ received: true, applied: false, reason: "already_settled" });
  }

  const outcome = await capturePaypalOrder(orderId);
  if (!outcome) return NextResponse.json({ received: true, captured: false });

  const result = await settlePayment(outcome);
  return NextResponse.json({ received: true, captured: true, ...result });
}
