import { describe, expect, it } from "vitest";

import { decideCheckout } from "./decide";

const base = {
  mode: "required" as const,
  payable: true,
  available: ["stripe"] as ("stripe" | "paypal")[],
  choice: "stripe" as "stripe" | "paypal" | "on_site" | null,
};

describe("decideCheckout", () => {
  it("opens a checkout with the gateway the client picked", () => {
    expect(decideCheckout(base)).toEqual({ kind: "checkout", provider: "stripe" });
    expect(decideCheckout({ ...base, available: ["stripe", "paypal"], choice: "paypal" })).toEqual({
      kind: "checkout",
      provider: "paypal",
    });
  });

  it("refuses a client who claims they will pay on site on a required offer", () => {
    expect(decideCheckout({ ...base, choice: "on_site" })).toEqual({
      kind: "refused",
      error: "payment_required",
    });
    // The same for a form that simply omits the answer.
    expect(decideCheckout({ ...base, choice: null })).toEqual({
      kind: "refused",
      error: "payment_required",
    });
  });

  it("lets an optional offer be settled in person", () => {
    expect(decideCheckout({ ...base, mode: "optional", choice: "on_site" })).toEqual({
      kind: "none",
    });
  });

  it("refuses a gateway the coach has not connected", () => {
    expect(decideCheckout({ ...base, available: ["stripe"], choice: "paypal" })).toEqual({
      kind: "refused",
      error: "gateway_unavailable",
    });
  });

  it("takes the booking unpaid when the coach has no gateway left", () => {
    // Payment was switched on, then the account was disconnected. Losing the
    // booking would be worse than taking it the way it worked before.
    expect(decideCheckout({ ...base, available: [], choice: "stripe" })).toEqual({ kind: "none" });
  });

  it("ignores payment on an offer whose price is not firm", () => {
    expect(decideCheckout({ ...base, payable: false })).toEqual({ kind: "none" });
  });

  it("does nothing at all when the offer does not ask for payment", () => {
    expect(decideCheckout({ ...base, mode: "off", choice: "stripe" })).toEqual({ kind: "none" });
  });
});
