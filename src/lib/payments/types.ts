import type { Tables } from "@/lib/supabase/database.types";

import type { PaymentProvider } from "./config";

export type PaymentAccount = Tables<"payment_accounts">;
export type Payment = Tables<"payments">;

/** What a provider needs to open a checkout. */
export type CheckoutRequest = {
  account: PaymentAccount;
  /** Our payments.id — comes back in the webhook and ties everything together. */
  reference: string;
  amountCents: number;
  currency: string;
  description: string;
  clientEmail: string;
  returnUrl: string;
  cancelUrl: string;
  locale: string;
};

export type CheckoutResult =
  { ok: true; externalId: string; redirectUrl: string } | { ok: false; error: string };

/** What a webhook or a return-trip capture tells us about one payment. */
export type ProviderOutcome = {
  provider: PaymentProvider;
  /** The checkout session / order id we stored as payments.external_id. */
  externalId: string;
  status: "paid" | "failed" | "cancelled";
  /** PaymentIntent or capture id, once there is one. */
  captureId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  failureReason?: string | null;
};

export type ConnectedAccountFacts = {
  externalId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  details: Record<string, unknown>;
};
