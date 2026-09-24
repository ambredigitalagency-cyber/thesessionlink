import "server-only";

/**
 * Everything the payment gateways need from the environment, in one place.
 *
 * Nothing here is ever sent to the browser. The public side only ever learns
 * which providers a coach has connected — see public_payment_options — and the
 * client is redirected to a URL our own server asked the provider for.
 *
 * A provider whose variables are missing is simply not offered: the product
 * works without payments, exactly as it did before, which is what keeps local
 * development and a fresh deployment usable before the accounts exist.
 *
 * ---------------------------------------------------------------------------
 * Stripe (platform account → Settings → Connect)
 *   STRIPE_SECRET_KEY        sk_live_… / sk_test_…  platform secret key
 *   STRIPE_CONNECT_CLIENT_ID ca_…                   OAuth client id (Standard)
 *   STRIPE_WEBHOOK_SECRET    whsec_…                signing secret of the
 *                                                   endpoint pointed at
 *                                                   /api/payments/webhook/stripe
 *
 * PayPal (developer dashboard → Partner / Commerce Platform)
 *   PAYPAL_CLIENT_ID         REST app client id
 *   PAYPAL_CLIENT_SECRET     REST app secret
 *   PAYPAL_PARTNER_ID        the platform's own merchant id (payer_id)
 *   PAYPAL_BN_CODE           attribution / BN code given by PayPal
 *   PAYPAL_WEBHOOK_ID        id of the webhook registered against
 *                            /api/payments/webhook/paypal
 *   PAYPAL_ENV               "sandbox" (default) or "live"
 * ---------------------------------------------------------------------------
 */

export const PAYMENT_PROVIDERS = ["stripe", "paypal"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const stripeEnv = {
  get secretKey() {
    return process.env.STRIPE_SECRET_KEY ?? "";
  },
  get connectClientId() {
    return process.env.STRIPE_CONNECT_CLIENT_ID ?? "";
  },
  get webhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
};

export const paypalEnv = {
  get clientId() {
    return process.env.PAYPAL_CLIENT_ID ?? "";
  },
  get clientSecret() {
    return process.env.PAYPAL_CLIENT_SECRET ?? "";
  },
  get partnerId() {
    return process.env.PAYPAL_PARTNER_ID ?? "";
  },
  get bnCode() {
    return process.env.PAYPAL_BN_CODE ?? "";
  },
  get webhookId() {
    return process.env.PAYPAL_WEBHOOK_ID ?? "";
  },
  get live() {
    return process.env.PAYPAL_ENV === "live";
  },
  get apiBase() {
    return this.live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  },
};

/** Can this provider be offered at all on this deployment? */
export function providerConfigured(provider: PaymentProvider): boolean {
  if (provider === "stripe") {
    return Boolean(stripeEnv.secretKey && stripeEnv.connectClientId);
  }
  return Boolean(paypalEnv.clientId && paypalEnv.clientSecret && paypalEnv.partnerId);
}

export function configuredProviders(): PaymentProvider[] {
  return PAYMENT_PROVIDERS.filter(providerConfigured);
}

/** How long a booking holds its slot while its checkout is open. */
export const CHECKOUT_HOLD_MINUTES = 30;
