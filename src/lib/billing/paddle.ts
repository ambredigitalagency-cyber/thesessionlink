import "server-only";

/**
 * Paddle Billing — the coach's subscription to TheSessionLink.
 *
 * Paddle is the merchant of record here: it sells the 19 €/month plan to the
 * coach, collects VAT and handles cards. This is unrelated to Stripe Connect
 * and PayPal (lib/payments), which carry what a coach's own clients pay them.
 *
 * ---------------------------------------------------------------------------
 * SANDBOX vs PRODUCTION
 *
 * Paddle runs two fully separate environments. Nothing crosses between them:
 * an API key, a price, a customer or a webhook secret from one does not exist
 * in the other.
 *
 *                       sandbox                        production
 *   API base URL        https://sandbox-api.paddle.com https://api.paddle.com
 *   API key prefix      pdl_sdbx_apikey_…              pdl_live_apikey_…
 *   client token        test_…                         live_…
 *   Paddle.js           Paddle.Environment.set("sandbox") before Initialize;
 *                       nothing to set in production
 *   Dashboard           sandbox-vendors.paddle.com     vendors.paddle.com
 *   Test cards          4242 4242 4242 4242, any future date, any CVC
 *
 * PADDLE_ENV selects the base URL (and the Paddle.js environment on the
 * client). It defaults to "sandbox" so a misconfigured deployment can never
 * charge anyone by accident; production must say so explicitly.
 *
 * Variables
 *   PADDLE_ENV                       "sandbox" (default) or "production"
 *   PADDLE_API_KEY                   server-side API key of that environment
 *   PADDLE_WEBHOOK_SECRET            secret of the notification destination
 *                                    pointed at /api/paddle/webhook
 *   PADDLE_PRICE_ID                  pri_… of the monthly plan in that environment
 *   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN  client-side token for Paddle.js (public
 *                                    by design: it can only open checkouts)
 *
 * The account also needs a "default payment link" (Paddle dashboard →
 * Checkout → Checkout settings): without one Paddle refuses to create a
 * checkout at all.
 * ---------------------------------------------------------------------------
 */

export type PaddleEnvironment = "sandbox" | "production";

export const paddleEnv = {
  get environment(): PaddleEnvironment {
    return process.env.PADDLE_ENV === "production" ? "production" : "sandbox";
  },
  get apiBase() {
    return this.environment === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";
  },
  get apiKey() {
    return process.env.PADDLE_API_KEY ?? "";
  },
  get webhookSecret() {
    return process.env.PADDLE_WEBHOOK_SECRET ?? "";
  },
  get priceId() {
    return process.env.PADDLE_PRICE_ID ?? "";
  },
  get clientToken() {
    return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
  },
};

/** Everything a checkout needs is set; otherwise the button is not offered. */
export function paddleConfigured(): boolean {
  return Boolean(paddleEnv.apiKey && paddleEnv.priceId && paddleEnv.clientToken);
}

export class PaddleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
  }
}

/** One call to the Paddle API of the configured environment. */
export async function paddleFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${paddleEnv.apiBase}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${paddleEnv.apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { code?: string; detail?: string };
  };
  if (!response.ok || json.error) {
    throw new PaddleError(
      response.status,
      json.error?.code ?? "paddle_error",
      json.error?.detail ?? "",
    );
  }
  return json.data as T;
}

/**
 * The coach's Paddle customer: the one we stored, else the one Paddle already
 * has for that email (a coach who started a checkout before), else a new one.
 */
export async function ensurePaddleCustomer(input: {
  existingId: string | null;
  email: string;
  name: string;
}): Promise<string> {
  if (input.existingId) return input.existingId;

  const found = await paddleFetch<{ id: string }[]>(
    `/customers?email=${encodeURIComponent(input.email)}&status=active`,
  );
  if (found[0]) return found[0].id;

  const created = await paddleFetch<{ id: string }>("/customers", {
    method: "POST",
    body: { email: input.email, name: input.name },
  });
  return created.id;
}

/**
 * A draft transaction for the monthly plan, bound to the coach server-side.
 *
 * custom_data.profile_id is how the webhook knows whose subscription this is.
 * It is set here, by our server, never by the browser: Paddle copies a
 * transaction's custom_data onto the subscription it creates, so every later
 * subscription event carries it too.
 */
export async function createSubscriptionTransaction(input: {
  customerId: string;
  profileId: string;
}): Promise<string> {
  const transaction = await paddleFetch<{ id: string }>("/transactions", {
    method: "POST",
    body: {
      items: [{ price_id: paddleEnv.priceId, quantity: 1 }],
      customer_id: input.customerId,
      custom_data: { profile_id: input.profileId },
    },
  });
  return transaction.id;
}
