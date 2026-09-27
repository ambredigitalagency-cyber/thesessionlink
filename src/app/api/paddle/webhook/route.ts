import { NextResponse, type NextRequest } from "next/server";

import { applyPaddleEvent } from "@/lib/billing/apply";
import { paddleEnv } from "@/lib/billing/paddle";
import { readPaddleEvent, verifyPaddleSignature } from "@/lib/billing/paddle-core";

export const dynamic = "force-dynamic";

/**
 * Paddle's word on a coach's subscription. The only thing that turns
 * subscription_active on or off.
 *
 * The raw body is read as text and verified before being parsed: the
 * signature covers the exact bytes Paddle sent. Once verified, the answer is
 * 200 even for events we do not act on — a non-2xx makes Paddle retry, and a
 * retry will not make an ignored event interesting. A failure while applying
 * answers 500 on purpose: that one should be retried, and applyPaddleEvent()
 * is safe to run again.
 */
export async function POST(request: NextRequest) {
  const secret = paddleEnv.webhookSecret;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const rawBody = await request.text();
  if (!verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"), secret)) {
    console.error("[paddle] rejected an unsigned or stale webhook");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const facts = readPaddleEvent(payload);
  if (!facts) return NextResponse.json({ received: true, ignored: true });

  try {
    const result = await applyPaddleEvent(facts);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error(
      "[paddle] applying",
      facts.eventType,
      facts.eventId,
      "failed",
      error instanceof Error ? error.message : "",
    );
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
