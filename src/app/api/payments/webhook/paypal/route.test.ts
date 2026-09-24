import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The PayPal webhook's own decisions, with PayPal and the database replaced.
 *
 * The reducers are tested elsewhere for what they read out of an event; what
 * is tested here is what the route *does* with them — which branch runs, and
 * what it calls. Two of those branches exist precisely because PayPal behaves
 * unlike Stripe, and neither can be exercised against a real account without
 * one, so they are worth pinning down here:
 *
 *   * an approved order is captured by the webhook as well as by the return
 *     trip, so a buyer who closes the tab still pays;
 *   * a withdrawn permission disconnects the account instead of quietly
 *     leaving it looking connected.
 */

const disconnectAccount = vi.fn();
const saveConnectedAccount = vi.fn();
const settlePayment = vi.fn(async () => ({ applied: true }));
const capturePaypalOrder = vi.fn();
const paypalSellerFacts = vi.fn();
const verifyPaypalSignature = vi.fn(async () => true);

/** Rows the fake database answers with, keyed by table. */
const rows: Record<string, unknown> = {};

vi.mock("@/lib/payments/accounts", () => ({ disconnectAccount, saveConnectedAccount }));
vi.mock("@/lib/payments/settle", () => ({ settlePayment }));

vi.mock("@/lib/payments/paypal", async (importOriginal) => ({
  // The pure reducers stay real; only the calls that leave the process are
  // replaced, so the route is still driven by genuine event parsing.
  ...(await importOriginal<typeof import("@/lib/payments/paypal")>()),
  capturePaypalOrder,
  paypalSellerFacts,
  verifyPaypalSignature,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: rows[table] ?? null }),
      };
      return chain;
    },
  }),
}));

const { POST } = await import("./route");

function webhook(event: unknown) {
  return new Request("https://example.test/api/payments/webhook/paypal", {
    method: "POST",
    body: JSON.stringify(event),
    headers: { "content-type": "application/json" },
  }) as never;
}

beforeEach(() => {
  vi.stubEnv("PAYPAL_WEBHOOK_ID", "WH-CONFIGURED");
  rows.payment_accounts = { profile_id: "profile-1" };
  rows.payments = { status: "pending" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  verifyPaypalSignature.mockResolvedValue(true);
});

describe("PayPal webhook", () => {
  it("refuses to look at an event it cannot verify", async () => {
    verifyPaypalSignature.mockResolvedValue(false);

    const response = await POST(webhook({ event_type: "PAYMENT.CAPTURE.COMPLETED" }));

    expect(response.status).toBe(400);
    expect(settlePayment).not.toHaveBeenCalled();
    expect(capturePaypalOrder).not.toHaveBeenCalled();
  });

  it("answers 503 rather than trust anything when no webhook id is configured", async () => {
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "");

    const response = await POST(webhook({ event_type: "PAYMENT.CAPTURE.COMPLETED" }));

    expect(response.status).toBe(503);
    expect(verifyPaypalSignature).not.toHaveBeenCalled();
  });

  it("captures an approved order, so a closed tab still pays", async () => {
    capturePaypalOrder.mockResolvedValue({
      provider: "paypal",
      externalId: "ORDER_7",
      status: "paid",
    });

    const response = await POST(
      webhook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER_7" } }),
    );

    expect(capturePaypalOrder).toHaveBeenCalledWith("ORDER_7");
    expect(settlePayment).toHaveBeenCalledWith(
      expect.objectContaining({ externalId: "ORDER_7", status: "paid" }),
    );
    await expect(response.json()).resolves.toMatchObject({ captured: true });
  });

  it("does not capture twice when the return trip got there first", async () => {
    rows.payments = { status: "paid" };

    const response = await POST(
      webhook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER_7" } }),
    );

    expect(capturePaypalOrder).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ reason: "already_settled" });
  });

  it("ignores an approved order it never opened", async () => {
    rows.payments = null;

    await POST(webhook({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "ORDER_X" } }));

    expect(capturePaypalOrder).not.toHaveBeenCalled();
  });

  it("disconnects the account when the coach withdraws the permission", async () => {
    const response = await POST(
      webhook({
        event_type: "MERCHANT.PARTNER-CONSENT.REVOKED",
        resource: { tracking_id: "ref-1" },
      }),
    );

    expect(disconnectAccount).toHaveBeenCalledWith("profile-1", "paypal");
    // Never re-read the seller and re-save it as connected on the way out.
    expect(paypalSellerFacts).not.toHaveBeenCalled();
    expect(saveConnectedAccount).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ disconnected: true });
  });

  it("records a finished onboarding with what the seller can actually do", async () => {
    paypalSellerFacts.mockResolvedValue({
      externalId: "MERCHANT_1",
      chargesEnabled: true,
      payoutsEnabled: true,
      details: {},
    });

    await POST(
      webhook({
        event_type: "MERCHANT.ONBOARDING.COMPLETED",
        resource: { tracking_id: "ref-1" },
      }),
    );

    expect(saveConnectedAccount).toHaveBeenCalledWith(
      "profile-1",
      "paypal",
      expect.objectContaining({ externalId: "MERCHANT_1", chargesEnabled: true }),
    );
    expect(disconnectAccount).not.toHaveBeenCalled();
  });

  it("leaves the account pending when PayPal will not describe the seller yet", async () => {
    paypalSellerFacts.mockResolvedValue(null);

    const response = await POST(
      webhook({
        event_type: "MERCHANT.ONBOARDING.COMPLETED",
        resource: { tracking_id: "ref-1" },
      }),
    );

    expect(saveConnectedAccount).not.toHaveBeenCalled();
    expect(disconnectAccount).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ pending: true });
  });

  it("settles a capture the ordinary way", async () => {
    await POST(
      webhook({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAPTURE_9",
          amount: { value: "45.90", currency_code: "EUR" },
          supplementary_data: { related_ids: { order_id: "ORDER_7" } },
        },
      }),
    );

    expect(settlePayment).toHaveBeenCalledWith(
      expect.objectContaining({ externalId: "ORDER_7", status: "paid", amountCents: 4590 }),
    );
  });
});
