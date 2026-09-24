import { NextResponse, type NextRequest } from "next/server";

import { refreshCapabilities } from "@/lib/payments/accounts";
import { stripeEnv } from "@/lib/payments/config";
import { settlePayment } from "@/lib/payments/settle";
import {
  stripeAccountEventFacts,
  stripeOutcome,
  verifyStripeSignature,
} from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe's word on what happened. The only thing that marks a booking paid.
 *
 * The raw body is read as text and verified before being parsed: a JSON.parse
 * of an unverified payload is already trusting it a little, and the signature
 * is computed over the exact bytes Stripe sent.
 *
 * Always answers 200 once the signature checks out, even when we do nothing
 * with the event — a non-2xx tells Stripe to retry, and retrying will not make
 * an event we do not care about interesting.
 */
export async function POST(request: NextRequest) {
  if (!stripeEnv.webhookSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const payload = await request.text();

  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    console.error("[stripe] rejected an unsigned or stale webhook");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const accountFacts = stripeAccountEventFacts(event);
  if (accountFacts) {
    await refreshCapabilities("stripe", accountFacts);
    return NextResponse.json({ received: true });
  }

  const outcome = stripeOutcome(event);
  if (!outcome) return NextResponse.json({ received: true, ignored: true });

  const result = await settlePayment(outcome);
  return NextResponse.json({ received: true, ...result });
}
