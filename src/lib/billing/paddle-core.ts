import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The pure half of the Paddle integration: whether a delivery is believed, and
 * what it means for a coach's subscription. No network, no database — tested
 * in paddle-core.test.ts with payloads shaped like Paddle's.
 */

/* -------------------------------------------------------------------------- */
/* Signature                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Paddle signs each delivery with the destination's secret:
 *
 *   Paddle-Signature: ts=1671552777;h1=eb4d0dc8…
 *
 * h1 is HMAC-SHA256(secret, `${ts}:${rawBody}`) in hex. While a secret is
 * being rotated Paddle sends one h1 per secret, so any match is enough. A
 * signature older than the tolerance is refused: a valid signature on stale
 * facts is how a replay attack looks.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;

  const parts = header.split(";").map((piece) => {
    const index = piece.indexOf("=");
    return [piece.slice(0, index).trim(), piece.slice(index + 1).trim()] as const;
  });
  const timestamp = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts.filter(([key]) => key === "h1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > toleranceSeconds) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}:${rawBody}`, "utf8").digest("hex"),
  );
  return signatures.some((given) => {
    const candidate = Buffer.from(given);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export const PADDLE_EVENTS = [
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "transaction.completed",
] as const;
export type PaddleEventType = (typeof PADDLE_EVENTS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Whether the coach has a paying relationship with the platform.
 *
 * `trialing` counts: the coach gave a card and Paddle's 14-day trial runs, so
 * they are a subscriber who has not been charged yet. `past_due` counts too:
 * Paddle is retrying a failed renewal (dunning) and cancels the subscription
 * itself if that fails — cutting the coach off at the first declined card
 * would punish an expired card harder than Paddle does. `paused` and
 * `canceled` do not.
 */
export function subscriptionIsActive(status: SubscriptionStatus | null): boolean {
  return status === "trialing" || status === "active" || status === "past_due";
}

export type PaddleFacts = {
  eventId: string;
  eventType: PaddleEventType;
  occurredAt: string;
  /** Set from our own transaction's custom_data, copied by Paddle onto the subscription. */
  profileId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  /** Only for subscription events. */
  status: SubscriptionStatus | null;
  renewsAt: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The facts a supported event carries, or null for anything else. */
export function readPaddleEvent(payload: unknown): PaddleFacts | null {
  if (!payload || typeof payload !== "object") return null;
  const event = payload as Record<string, unknown>;
  const type = event.event_type as string;
  if (!PADDLE_EVENTS.includes(type as PaddleEventType)) return null;
  if (typeof event.event_id !== "string" || typeof event.occurred_at !== "string") return null;

  const data = (event.data ?? {}) as Record<string, unknown>;
  const custom = (data.custom_data ?? {}) as Record<string, unknown>;
  const profileId =
    typeof custom.profile_id === "string" && UUID.test(custom.profile_id)
      ? custom.profile_id
      : null;
  const isSubscription = type.startsWith("subscription.");
  const rawStatus = isSubscription ? (data.status as string) : null;
  const status = SUBSCRIPTION_STATUSES.includes(rawStatus as SubscriptionStatus)
    ? (rawStatus as SubscriptionStatus)
    : null;
  if (isSubscription && !status) return null;

  const period = (data.current_billing_period ?? null) as { ends_at?: string } | null;

  return {
    eventId: event.event_id,
    eventType: type as PaddleEventType,
    occurredAt: event.occurred_at,
    profileId,
    customerId: typeof data.customer_id === "string" ? data.customer_id : null,
    subscriptionId: isSubscription
      ? typeof data.id === "string"
        ? data.id
        : null
      : typeof data.subscription_id === "string"
        ? data.subscription_id
        : null,
    status,
    renewsAt: isSubscription
      ? ((data.next_billed_at as string | null) ?? period?.ends_at ?? null)
      : null,
  };
}
