import { describe, expect, it } from "vitest";

import { chargeableAmount, decimalString, offerIsPayable, toMinorUnits } from "./amount";

describe("toMinorUnits", () => {
  it("rounds to the cent instead of trusting the float", () => {
    expect(toMinorUnits(45.9, "EUR")).toBe(4590);
    // 19.99 * 100 is 1998.9999999999998 in binary floating point.
    expect(toMinorUnits(19.99, "EUR")).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2, "EUR")).toBe(30);
  });

  it("keeps whole units for currencies that have no cents", () => {
    expect(toMinorUnits(1200, "JPY")).toBe(1200);
    expect(decimalString(1200, "JPY")).toBe("1200");
    expect(decimalString(4590, "EUR")).toBe("45.90");
  });
});

describe("offerIsPayable", () => {
  it("only accepts a firm, positive price", () => {
    expect(offerIsPayable({ price: 45, price_type: "fixed" })).toBe(true);
    expect(offerIsPayable({ price: 45, price_type: "from" })).toBe(false);
    expect(offerIsPayable({ price: null, price_type: "on_request" })).toBe(false);
    expect(offerIsPayable({ price: 0, price_type: "fixed" })).toBe(false);
    expect(offerIsPayable({ price: null, price_type: "free" })).toBe(false);
  });
});

describe("chargeableAmount", () => {
  it("multiplies by the quantity", () => {
    expect(chargeableAmount({ price: 12.5, price_type: "fixed" }, "EUR", 3)).toBe(3750);
  });

  it("treats a missing or silly quantity as one", () => {
    expect(chargeableAmount({ price: 12.5, price_type: "fixed" }, "EUR")).toBe(1250);
    expect(chargeableAmount({ price: 12.5, price_type: "fixed" }, "EUR", 0)).toBe(1250);
  });

  it("returns nothing to charge when the price is not firm", () => {
    expect(chargeableAmount({ price: 50, price_type: "from" }, "EUR", 1)).toBeNull();
  });
});
