import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyPaypalSignature } from "./paypal";

/**
 * PayPal does not let us check a signature locally — the answer comes from an
 * API call. So what is worth pinning down is the decision around that call:
 * what we send, and what we conclude from every shape of answer.
 *
 * The rule the tests enforce is that only an explicit SUCCESS is believed.
 * Everything else — a failure, a network error, an unconfigured webhook id —
 * means "do not trust this delivery", because an event we cannot verify is one
 * we cannot tell apart from a forged one.
 */

const EVENT = JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED", id: "WH-1" });

function paypalHeaders() {
  return new Headers({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/cert.pem",
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-sig": "sig-1",
    "paypal-transmission-time": "2026-09-25T10:00:00Z",
  });
}

/** Answers the token call, then the verification call with `verification`. */
function stubPaypal(verification: unknown, { ok = true }: { ok?: boolean } = {}) {
  const calls: { url: string; body: unknown }[] = [];

  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    // The token call is form-encoded; only the verification call is JSON.
    let body: unknown = null;
    try {
      body = init?.body ? JSON.parse(String(init.body)) : null;
    } catch {
      body = String(init?.body);
    }
    calls.push({ url: href, body });

    if (href.endsWith("/v1/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "A-token" }), { status: 200 });
    }
    return new Response(JSON.stringify(verification), { status: ok ? 200 : 400 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "client");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
  vi.stubEnv("PAYPAL_WEBHOOK_ID", "WH-CONFIGURED");
  vi.stubEnv("PAYPAL_ENV", "sandbox");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifyPaypalSignature", () => {
  it("believes an explicit SUCCESS", async () => {
    stubPaypal({ verification_status: "SUCCESS" });
    expect(await verifyPaypalSignature(paypalHeaders(), EVENT)).toBe(true);
  });

  it("refuses a FAILURE", async () => {
    stubPaypal({ verification_status: "FAILURE" });
    expect(await verifyPaypalSignature(paypalHeaders(), EVENT)).toBe(false);
  });

  it("refuses an answer that says nothing", async () => {
    stubPaypal({});
    expect(await verifyPaypalSignature(paypalHeaders(), EVENT)).toBe(false);
  });

  it("refuses when PayPal itself errors", async () => {
    stubPaypal({ verification_status: "SUCCESS" }, { ok: false });
    expect(await verifyPaypalSignature(paypalHeaders(), EVENT)).toBe(false);
  });

  it("refuses without ever calling PayPal when no webhook id is configured", async () => {
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "");
    const calls = stubPaypal({ verification_status: "SUCCESS" });

    expect(await verifyPaypalSignature(paypalHeaders(), EVENT)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("sends the transmission headers, the configured webhook id and the event itself", async () => {
    const calls = stubPaypal({ verification_status: "SUCCESS" });
    await verifyPaypalSignature(paypalHeaders(), EVENT);

    const verification = calls.find((call) => call.url.includes("verify-webhook-signature"));
    expect(verification?.url).toContain("api-m.sandbox.paypal.com");
    expect(verification?.body).toMatchObject({
      auth_algo: "SHA256withRSA",
      transmission_id: "tx-1",
      transmission_sig: "sig-1",
      transmission_time: "2026-09-25T10:00:00Z",
      webhook_id: "WH-CONFIGURED",
      webhook_event: { event_type: "PAYMENT.CAPTURE.COMPLETED", id: "WH-1" },
    });
  });

  it("refuses a body that is not the JSON PayPal would have sent", async () => {
    stubPaypal({ verification_status: "SUCCESS" });
    await expect(verifyPaypalSignature(paypalHeaders(), "not json")).rejects.toThrow();
  });
});
