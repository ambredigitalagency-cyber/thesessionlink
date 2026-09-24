import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { stripeEnv } from "./config";
import type {
  CheckoutRequest,
  CheckoutResult,
  ConnectedAccountFacts,
  ProviderOutcome,
} from "./types";

/**
 * Stripe, connected as a STANDARD account and charged directly.
 *
 * Why Standard rather than Express, for an independent coach:
 *
 *   * The money is the coach's from the first second. A direct charge — a
 *     Checkout Session created *on* their account via the Stripe-Account
 *     header — settles into their own balance. TheSessionLink never holds
 *     funds, never owes a payout, and cannot lose them if it disappears.
 *   * Liability follows the money. Refunds, disputes and negative balances are
 *     between the coach and Stripe. With Express, the platform is on the hook
 *     for all three, which is not a promise a 9 €/month product should make.
 *   * The coach keeps an account they own: their own dashboard, their own
 *     payout schedule, their own negotiated fees, usable outside this product.
 *   * Express earns its extra responsibility when the platform takes a cut and
 *     wants its own branding through onboarding. We take no cut here, so it
 *     would be liability bought for nothing.
 *
 * The price is a Stripe-branded onboarding the coach must complete once. That
 * is the right trade: it is their business relationship, not ours.
 *
 * No SDK. Every call is an explicit form-encoded POST, which keeps what we send
 * — and what we never send — readable.
 */

const API = "https://api.stripe.com/v1";
const OAUTH_TOKEN = "https://connect.stripe.com/oauth/token";
const OAUTH_AUTHORIZE = "https://connect.stripe.com/oauth/authorize";

function form(values: Record<string, string | number | undefined | null>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  return body.toString();
}

async function callStripe(
  path: string,
  init: { method?: string; body?: string; account?: string } = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeEnv.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  // Acting on the connected account: this is what makes the charge direct.
  if (init.account) headers["Stripe-Account"] = init.account;

  const response = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = data.error as { message?: string } | undefined;
    console.error("[stripe]", path, response.status, error?.message ?? "");
  }
  return { ok: response.ok, data };
}

/* -------------------------------------------------------------------------- */
/* Connecting a coach                                                          */
/* -------------------------------------------------------------------------- */

/** Where the coach is sent to link their Stripe account. */
export function stripeAuthorizeUrl(state: string, redirectUri: string, email?: string | null) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: stripeEnv.connectClientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state,
  });
  if (email) params.set("stripe_user[email]", email);
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

/** Exchanges the one-time code for the connected account id. */
export async function exchangeStripeCode(code: string): Promise<ConnectedAccountFacts | null> {
  const response = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeEnv.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form({ grant_type: "authorization_code", code }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const accountId = data.stripe_user_id;

  if (!response.ok || typeof accountId !== "string") {
    console.error("[stripe] oauth exchange failed", response.status, data.error_description ?? "");
    return null;
  }

  return (
    (await stripeAccountFacts(accountId)) ?? {
      externalId: accountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      details: {},
    }
  );
}

/** What the account can currently do. Re-read on every webhook that says so. */
export async function stripeAccountFacts(accountId: string): Promise<ConnectedAccountFacts | null> {
  const { ok, data } = await callStripe(`/accounts/${accountId}`);
  if (!ok) return null;

  return {
    externalId: accountId,
    chargesEnabled: data.charges_enabled === true,
    payoutsEnabled: data.payouts_enabled === true,
    details: {
      email: data.email ?? null,
      country: data.country ?? null,
      default_currency: data.default_currency ?? null,
      business_name:
        (data.business_profile as { name?: string } | undefined)?.name ?? data.email ?? null,
    },
  };
}

/** Severs the link on Stripe's side too, so the coach is really disconnected. */
export async function revokeStripeAccess(accountId: string): Promise<boolean> {
  const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeEnv.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form({ client_id: stripeEnv.connectClientId, stripe_user_id: accountId }),
  });
  return response.ok;
}

/* -------------------------------------------------------------------------- */
/* Taking a payment                                                            */
/* -------------------------------------------------------------------------- */

export async function createStripeCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const account = request.account.external_id;
  if (!account) return { ok: false, error: "gateway_unavailable" };

  const { ok, data } = await callStripe("/checkout/sessions", {
    method: "POST",
    account,
    body: form({
      mode: "payment",
      success_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      customer_email: request.clientEmail,
      locale: request.locale === "fr" ? "fr" : "en",
      client_reference_id: request.reference,
      "metadata[payment_id]": request.reference,
      "payment_intent_data[metadata][payment_id]": request.reference,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": request.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": request.amountCents,
      "line_items[0][price_data][product_data][name]": request.description,
    }),
  });

  const id = data.id;
  const url = data.url;
  if (!ok || typeof id !== "string" || typeof url !== "string") {
    return { ok: false, error: "gateway_error" };
  }

  return { ok: true, externalId: id, redirectUrl: url };
}

/* -------------------------------------------------------------------------- */
/* Webhooks                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Checks the Stripe-Signature header against the raw body.
 *
 * Nothing that arrives at the webhook route is believed before this returns
 * true: the body is attacker-controlled until the signature says otherwise.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret = stripeEnv.webhookSecret,
  toleranceSeconds = 300,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const index = piece.indexOf("=");
      return [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
    }),
  );

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;

  // A replayed event is a valid signature on stale facts; refuse old ones.
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`, "utf8")
    .digest("hex");

  const given = parts.v1 ?? "";
  if (given.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Reduces a Stripe event to what this product needs to know, or null. */
export function stripeOutcome(event: unknown): ProviderOutcome | null {
  if (!event || typeof event !== "object") return null;
  const { type, data } = event as { type?: string; data?: { object?: Record<string, unknown> } };
  const object = data?.object;
  if (!type || !object) return null;

  const sessionId = typeof object.id === "string" ? object.id : null;

  switch (type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!sessionId) return null;
      // "complete" only counts when the money is actually there.
      if (object.payment_status !== "paid") return null;
      return {
        provider: "stripe",
        externalId: sessionId,
        status: "paid",
        captureId: typeof object.payment_intent === "string" ? object.payment_intent : null,
        amountCents: typeof object.amount_total === "number" ? object.amount_total : null,
        currency: typeof object.currency === "string" ? object.currency.toUpperCase() : null,
      };
    }
    case "checkout.session.async_payment_failed":
      return sessionId
        ? { provider: "stripe", externalId: sessionId, status: "failed", failureReason: type }
        : null;
    case "checkout.session.expired":
      return sessionId ? { provider: "stripe", externalId: sessionId, status: "cancelled" } : null;
    default:
      return null;
  }
}

/** The connected account an event is about, when it is about one. */
export function stripeEventAccount(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const account = (event as { account?: unknown }).account;
  return typeof account === "string" ? account : null;
}

export function stripeAccountEventFacts(event: unknown): ConnectedAccountFacts | null {
  if (!event || typeof event !== "object") return null;
  const { type, data } = event as { type?: string; data?: { object?: Record<string, unknown> } };
  if (type !== "account.updated" || !data?.object) return null;

  const object = data.object;
  if (typeof object.id !== "string") return null;

  return {
    externalId: object.id,
    chargesEnabled: object.charges_enabled === true,
    payoutsEnabled: object.payouts_enabled === true,
    details: { email: object.email ?? null, country: object.country ?? null },
  };
}
