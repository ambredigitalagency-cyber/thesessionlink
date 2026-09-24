import type { OnlinePayment } from "@/lib/offers/schema";

import type { PaymentProvider } from "./config";

/**
 * Whether a booking has to be paid now, and with what.
 *
 * Pure, and deliberately so: this is the rule that decides whether money is
 * asked for, and a client's form can lie about every input to it. Keeping it
 * free of database calls means it can be tested for exactly the cases that
 * matter — chief among them a request claiming "I will pay on site" on an
 * offer whose coach said payment is required.
 */
export type CheckoutDecision =
  | { kind: "none" }
  | { kind: "checkout"; provider: PaymentProvider }
  | { kind: "refused"; error: "payment_required" | "gateway_unavailable" };

export function decideCheckout(input: {
  /** What the offer asks for. */
  mode: OnlinePayment;
  /** Whether the offer has a firm, positive price to charge. */
  payable: boolean;
  /** Gateways the coach can actually be paid through right now. */
  available: PaymentProvider[];
  /** What the client picked, if anything. */
  choice: "stripe" | "paypal" | "on_site" | null | undefined;
}): CheckoutDecision {
  const { mode, payable, available, choice } = input;

  if (mode === "off") return { kind: "none" };

  // A price that is "from 50 €" or "on request" is a conversation, not an
  // amount. The offer form refuses to switch payment on without a firm price,
  // but a price edited afterwards must not leave a broken checkout behind.
  if (!payable) return { kind: "none" };

  // The coach turned payment on and then disconnected their gateway. Taking
  // the booking unpaid loses less than refusing it outright — the coach still
  // sees it, and can settle in person as they did before.
  if (available.length === 0) return { kind: "none" };

  if (choice === "on_site" || choice === null || choice === undefined) {
    // Paying on site is only an answer when the coach allowed it.
    return mode === "required" ? { kind: "refused", error: "payment_required" } : { kind: "none" };
  }

  if (!available.includes(choice)) return { kind: "refused", error: "gateway_unavailable" };

  return { kind: "checkout", provider: choice };
}
