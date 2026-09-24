import "server-only";

import { decimalString, minorUnitFactor } from "./amount";
import { paypalEnv } from "./config";
import type {
  CheckoutRequest,
  CheckoutResult,
  ConnectedAccountFacts,
  ProviderOutcome,
} from "./types";

/**
 * PayPal, through Commerce Platform partner referrals.
 *
 * The coach connects their own PayPal account once; from then on every order
 * names them as the payee, so the payment lands in their balance and not ours
 * — the same rule as Stripe, reached a different way.
 *
 * Two differences from Stripe worth knowing while reading this file:
 *
 *   * An approved order is not a paid one. PayPal hands the buyer back to us
 *     after approval and expects a capture call. So the return route captures,
 *     and the webhook confirms; both funnel into the same settlement, which is
 *     idempotent because whichever arrives second changes nothing.
 *   * Webhook signatures are verified by asking PayPal, not by computing an
 *     HMAC: the check is a round trip, and a failure means "do not trust this".
 */

type Json = Record<string, unknown>;

async function accessToken(): Promise<string | null> {
  const basic = Buffer.from(`${paypalEnv.clientId}:${paypalEnv.clientSecret}`).toString("base64");

  const response = await fetch(`${paypalEnv.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok || typeof data.access_token !== "string") {
    console.error("[paypal] token failed", response.status);
    return null;
  }
  return data.access_token;
}

async function callPaypal(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ ok: boolean; status: number; data: Json }> {
  const token = init.token ?? (await accessToken());
  if (!token) return { ok: false, status: 0, data: {} };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (paypalEnv.bnCode) headers["PayPal-Partner-Attribution-Id"] = paypalEnv.bnCode;

  const response = await fetch(`${paypalEnv.apiBase}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const data = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok) console.error("[paypal]", path, response.status, data.message ?? "");
  return { ok: response.ok, status: response.status, data };
}

function findLink(links: unknown, rel: string): string | null {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    const entry = link as { rel?: string; href?: string };
    if (entry.rel === rel && typeof entry.href === "string") return entry.href;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Connecting a coach                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Starts a partner referral and returns where to send the coach.
 *
 * `trackingRef` is ours; PayPal hands it back on the return trip, which is how
 * the coach coming back is matched to the row that started the flow.
 */
export async function createPaypalReferral(
  trackingRef: string,
  returnUrl: string,
  email?: string | null,
): Promise<string | null> {
  const { ok, data } = await callPaypal("/v2/customer/partner-referrals", {
    method: "POST",
    body: {
      tracking_id: trackingRef,
      email,
      partner_config_override: { return_url: returnUrl, return_url_description: "TheSessionLink" },
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: {
                features: ["PAYMENT", "REFUND", "PARTNER_FEE"],
              },
            },
          },
        },
      ],
      products: ["EXPRESS_CHECKOUT"],
      legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
    },
  });

  return ok ? findLink(data.links, "action_url") : null;
}

/**
 * Asks PayPal what became of a referral, by our own tracking reference.
 *
 * primary_email_confirmed and payments_receivable are the two flags that decide
 * whether this coach can be offered to clients: an account that cannot receive
 * payments must never be shown as a payment option.
 */
export async function paypalSellerFacts(
  trackingRef: string,
): Promise<ConnectedAccountFacts | null> {
  const { ok, data } = await callPaypal(
    `/v1/customer/partners/${encodeURIComponent(paypalEnv.partnerId)}/merchant-integrations?tracking_id=${encodeURIComponent(trackingRef)}`,
  );
  if (!ok) return null;

  const merchantId = data.merchant_id;
  if (typeof merchantId !== "string") return null;

  const receivable = data.payments_receivable === true;
  const emailConfirmed = data.primary_email_confirmed === true;

  return {
    externalId: merchantId,
    chargesEnabled: receivable && emailConfirmed,
    payoutsEnabled: receivable,
    details: {
      email: data.primary_email ?? null,
      payments_receivable: receivable,
      primary_email_confirmed: emailConfirmed,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Taking a payment                                                            */
/* -------------------------------------------------------------------------- */

export async function createPaypalOrder(request: CheckoutRequest): Promise<CheckoutResult> {
  const merchantId = request.account.external_id;
  if (!merchantId) return { ok: false, error: "gateway_unavailable" };

  const { ok, data } = await callPaypal("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          // Ours, echoed back on every webhook about this order.
          custom_id: request.reference,
          invoice_id: request.reference,
          description: request.description.slice(0, 127),
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: decimalString(request.amountCents, request.currency),
          },
          // The coach is the payee. The money never reaches the platform.
          payee: { merchant_id: merchantId },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: request.returnUrl,
            cancel_url: request.cancelUrl,
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            locale: request.locale === "fr" ? "fr-FR" : "en-US",
          },
        },
      },
    },
  });

  const id = data.id;
  const approve = findLink(data.links, "payer-action") ?? findLink(data.links, "approve");

  if (!ok || typeof id !== "string" || !approve) return { ok: false, error: "gateway_error" };
  return { ok: true, externalId: id, redirectUrl: approve };
}

/**
 * Captures an approved order. Called on the return trip; the webhook confirms.
 *
 * A second call on an already-captured order answers 422
 * ORDER_ALREADY_CAPTURED, which is a success as far as we are concerned.
 */
export async function capturePaypalOrder(orderId: string): Promise<ProviderOutcome | null> {
  const { ok, status, data } = await callPaypal(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    { method: "POST", body: {} },
  );

  if (!ok) {
    if (status === 422) return paypalOrderFacts(orderId);
    return {
      provider: "paypal",
      externalId: orderId,
      status: "failed",
      failureReason: "capture_failed",
    };
  }

  return readOrder(orderId, data);
}

/** Reads an order back, for the cases where capturing told us nothing new. */
export async function paypalOrderFacts(orderId: string): Promise<ProviderOutcome | null> {
  const { ok, data } = await callPaypal(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  return ok ? readOrder(orderId, data) : null;
}

function readOrder(orderId: string, order: Json): ProviderOutcome {
  const units = Array.isArray(order.purchase_units) ? order.purchase_units : [];
  const first = (units[0] ?? {}) as Json;
  const payments = (first.payments ?? {}) as Json;
  const captures = Array.isArray(payments.captures) ? payments.captures : [];
  const capture = (captures[0] ?? {}) as Json;
  const amount = (capture.amount ?? first.amount ?? {}) as Json;

  const completed = order.status === "COMPLETED" || capture.status === "COMPLETED";
  const value = typeof amount.value === "string" ? Number(amount.value) : null;
  const currency = typeof amount.currency_code === "string" ? amount.currency_code : null;

  return {
    provider: "paypal",
    externalId: orderId,
    status: completed ? "paid" : "failed",
    captureId: typeof capture.id === "string" ? capture.id : null,
    amountCents: toMinor(value, currency),
    currency,
    failureReason: completed ? null : String(order.status ?? "not_completed"),
  };
}

/**
 * PayPal states amounts as decimal strings; we compare them in minor units.
 *
 * The factor has to come from minorUnitFactor(), not from a guess: a currency
 * wrongly treated as having cents arrives a hundred times too large, and
 * settlePayment() refuses it as a mismatch — a payment taken and then not
 * credited.
 */
function toMinor(value: number | null, currency: string | null): number | null {
  if (value === null || currency === null) return null;
  return Math.round(value * minorUnitFactor(currency));
}

/* -------------------------------------------------------------------------- */
/* Webhooks                                                                    */
/* -------------------------------------------------------------------------- */

/** Asks PayPal whether this delivery is genuinely theirs. */
export async function verifyPaypalSignature(headers: Headers, rawBody: string): Promise<boolean> {
  if (!paypalEnv.webhookId) return false;

  const { ok, data } = await callPaypal("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: paypalEnv.webhookId,
      webhook_event: JSON.parse(rawBody),
    },
  });

  return ok && data.verification_status === "SUCCESS";
}

/**
 * Reduces a PayPal event to an outcome.
 *
 * The id we stored is the *order* id, so a capture event has to be traced back
 * to it through supplementary_data — PayPal does not repeat it at the top.
 */
export function paypalOutcome(event: unknown): ProviderOutcome | null {
  if (!event || typeof event !== "object") return null;
  const { event_type: type, resource } = event as { event_type?: string; resource?: Json };
  if (!type || !resource) return null;

  const supplementary = (resource.supplementary_data ?? {}) as Json;
  const related = (supplementary.related_ids ?? {}) as Json;
  const orderId =
    (typeof related.order_id === "string" ? related.order_id : null) ??
    (type.startsWith("CHECKOUT.ORDER") && typeof resource.id === "string" ? resource.id : null);

  if (!orderId) return null;

  const amount = (resource.amount ?? {}) as Json;
  const value = typeof amount.value === "string" ? Number(amount.value) : null;
  const currency = typeof amount.currency_code === "string" ? amount.currency_code : null;

  switch (type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      return {
        provider: "paypal",
        externalId: orderId,
        status: "paid",
        captureId: typeof resource.id === "string" ? resource.id : null,
        amountCents: toMinor(value, currency),
        currency,
      };
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return { provider: "paypal", externalId: orderId, status: "failed", failureReason: type };
    case "CHECKOUT.ORDER.VOIDED":
      return { provider: "paypal", externalId: orderId, status: "cancelled" };
    case "PAYMENT.CAPTURE.REFUNDED":
      // Refunds are not issued by this product yet, but a refund made from the
      // coach's own PayPal dashboard must still be reflected here.
      return { provider: "paypal", externalId: orderId, status: "failed", failureReason: type };
    default:
      return null;
  }
}

/**
 * An order the buyer approved but that nobody has captured yet.
 *
 * Approval is not payment: PayPal expects a capture call, and the only thing
 * that normally triggers it is the buyer landing back on /api/payments/return.
 * A closed tab would leave the order approved, the money untaken and the slot
 * expiring for no reason — so the webhook captures too, and whichever of the
 * two gets there second is answered with ORDER_ALREADY_CAPTURED.
 */
export function paypalApprovedOrder(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const { event_type: type, resource } = event as { event_type?: string; resource?: Json };
  if (type !== "CHECKOUT.ORDER.APPROVED" || !resource) return null;
  return typeof resource.id === "string" ? resource.id : null;
}

/** A merchant-onboarding event: the coach finished — or undid — their setup. */
export function paypalMerchantEvent(
  event: unknown,
): { trackingRef: string; revoked: boolean } | null {
  if (!event || typeof event !== "object") return null;
  const { event_type: type, resource } = event as { event_type?: string; resource?: Json };
  if (type !== "MERCHANT.ONBOARDING.COMPLETED" && type !== "MERCHANT.PARTNER-CONSENT.REVOKED") {
    return null;
  }
  const tracking = resource?.tracking_id;
  if (typeof tracking !== "string") return null;

  return { trackingRef: tracking, revoked: type === "MERCHANT.PARTNER-CONSENT.REVOKED" };
}
