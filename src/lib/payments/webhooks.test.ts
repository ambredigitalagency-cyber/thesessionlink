import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { paypalApprovedOrder, paypalMerchantEvent, paypalOutcome } from "./paypal";
import { stripeOutcome, verifyStripeSignature } from "./stripe";

/**
 * The parts of the webhook path that can be tested without an account: whether
 * a delivery is believed, and what it is understood to mean. Everything these
 * two answer decides whether money is recorded, so they are worth pinning down
 * with payloads shaped like the real ones.
 */

const SECRET = "whsec_test_secret";

function sign(payload: string, timestamp: number, secret = SECRET) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("verifyStripeSignature", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1_800_000_000_000;
  const timestamp = Math.floor(now / 1000);

  it("accepts a correctly signed, fresh delivery", () => {
    expect(verifyStripeSignature(payload, sign(payload, timestamp), SECRET, 300, now)).toBe(true);
  });

  it("refuses a body that changed after signing", () => {
    const header = sign(payload, timestamp);
    const tampered = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", x: 1 });
    expect(verifyStripeSignature(tampered, header, SECRET, 300, now)).toBe(false);
  });

  it("refuses a signature made with another secret", () => {
    const header = sign(payload, timestamp, "whsec_someone_else");
    expect(verifyStripeSignature(payload, header, SECRET, 300, now)).toBe(false);
  });

  it("refuses a replay of an old delivery", () => {
    const header = sign(payload, timestamp - 3600);
    expect(verifyStripeSignature(payload, header, SECRET, 300, now)).toBe(false);
  });

  it("refuses a missing header or an unconfigured secret", () => {
    expect(verifyStripeSignature(payload, null, SECRET, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, timestamp), "", 300, now)).toBe(false);
  });
});

describe("stripeOutcome", () => {
  const session = (over: Record<string, unknown> = {}) => ({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_status: "paid",
        payment_intent: "pi_test_456",
        amount_total: 4590,
        currency: "eur",
        ...over,
      },
    },
  });

  it("reads a completed session as paid", () => {
    expect(stripeOutcome(session())).toEqual({
      provider: "stripe",
      externalId: "cs_test_123",
      status: "paid",
      captureId: "pi_test_456",
      amountCents: 4590,
      currency: "EUR",
    });
  });

  it("does not call a session paid when the money is not there", () => {
    expect(stripeOutcome(session({ payment_status: "unpaid" }))).toBeNull();
  });

  it("reads an expired session as cancelled", () => {
    const event = { type: "checkout.session.expired", data: { object: { id: "cs_test_123" } } };
    expect(stripeOutcome(event)?.status).toBe("cancelled");
  });

  it("ignores events it has no opinion about", () => {
    expect(
      stripeOutcome({ type: "customer.created", data: { object: { id: "cus_1" } } }),
    ).toBeNull();
    expect(stripeOutcome(null)).toBeNull();
    expect(stripeOutcome("nonsense")).toBeNull();
  });
});

describe("paypalOutcome", () => {
  it("traces a capture back to the order we stored", () => {
    const event = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAPTURE_9",
        amount: { value: "45.90", currency_code: "EUR" },
        supplementary_data: { related_ids: { order_id: "ORDER_7" } },
      },
    };

    expect(paypalOutcome(event)).toEqual({
      provider: "paypal",
      externalId: "ORDER_7",
      status: "paid",
      captureId: "CAPTURE_9",
      amountCents: 4590,
      currency: "EUR",
    });
  });

  it("reads a denied capture as failed", () => {
    const event = {
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: { id: "CAPTURE_9", supplementary_data: { related_ids: { order_id: "ORDER_7" } } },
    };
    expect(paypalOutcome(event)?.status).toBe("failed");
  });

  it("gives up rather than guess when no order can be identified", () => {
    const event = { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAPTURE_9" } };
    expect(paypalOutcome(event)).toBeNull();
  });

  it("converts amounts with the currency's own minor unit", () => {
    const capture = (value: string, currency: string) => ({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAPTURE_9",
        amount: { value, currency_code: currency },
        supplementary_data: { related_ids: { order_id: "ORDER_7" } },
      },
    });

    // A zero-decimal currency read as if it had cents arrives a hundred times
    // too large, and settlePayment() then refuses the payment as a mismatch.
    expect(paypalOutcome(capture("1200", "JPY"))?.amountCents).toBe(1200);
    expect(paypalOutcome(capture("15000", "KRW"))?.amountCents).toBe(15000);
    expect(paypalOutcome(capture("5000", "XOF"))?.amountCents).toBe(5000);
    expect(paypalOutcome(capture("45.90", "EUR"))?.amountCents).toBe(4590);
    expect(paypalOutcome(capture("19.99", "USD"))?.amountCents).toBe(1999);
  });
});

describe("paypalApprovedOrder", () => {
  it("picks out an order waiting to be captured", () => {
    const event = { event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER_7" } };
    expect(paypalApprovedOrder(event)).toBe("ORDER_7");
  });

  it("ignores everything else", () => {
    expect(
      paypalApprovedOrder({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "C_1" } }),
    ).toBeNull();
    expect(paypalApprovedOrder({ event_type: "CHECKOUT.ORDER.APPROVED" })).toBeNull();
    expect(paypalApprovedOrder(null)).toBeNull();
  });
});

describe("paypalMerchantEvent", () => {
  it("tells a finished onboarding apart from a withdrawn permission", () => {
    expect(
      paypalMerchantEvent({
        event_type: "MERCHANT.ONBOARDING.COMPLETED",
        resource: { tracking_id: "ref-1" },
      }),
    ).toEqual({ trackingRef: "ref-1", revoked: false });

    expect(
      paypalMerchantEvent({
        event_type: "MERCHANT.PARTNER-CONSENT.REVOKED",
        resource: { tracking_id: "ref-1" },
      }),
    ).toEqual({ trackingRef: "ref-1", revoked: true });
  });

  it("ignores an event with no reference to match on", () => {
    expect(
      paypalMerchantEvent({ event_type: "MERCHANT.ONBOARDING.COMPLETED", resource: {} }),
    ).toBeNull();
    expect(
      paypalMerchantEvent({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} }),
    ).toBeNull();
  });
});
