import { describe, expect, it } from "vitest";

import { acceptsAddons, addonsSchema, addonsTotal, parseAddons, pickAddons } from "./addons";

const offered = [
  { id: "a_towel", label: "Serviette et douche", price: 5, description: null },
  { id: "a_beard", label: "Taille de barbe", price: 12.5, description: "10 min de plus" },
];

describe("add-ons", () => {
  it("only exist on the two action types that are a transaction", () => {
    expect(acceptsAddons("calendar_booking")).toBe(true);
    expect(acceptsAddons("direct_reservation")).toBe(true);
    expect(acceptsAddons("quote_request")).toBe(false);
    expect(acceptsAddons("contact_request")).toBe(false);
  });

  it("resolves the client's choice against what is offered, ignoring the rest", () => {
    expect(pickAddons(offered, ["a_beard", "a_forged"])).toEqual([
      { id: "a_beard", label: "Taille de barbe", price: 12.5 },
    ]);
    expect(pickAddons(offered, [])).toEqual([]);
  });

  it("adds up in minor units, per booking", () => {
    const taken = pickAddons(offered, ["a_towel", "a_beard"]);
    expect(addonsTotal(taken, "EUR")).toBe(1750);
    expect(addonsTotal(taken, "XOF")).toBe(18);
  });

  it("refuses a list that is too long, unlabelled or with duplicate ids", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      id: `a_${index}`,
      label: "x",
      price: 1,
    }));
    expect(addonsSchema.safeParse(many).success).toBe(false);
    expect(addonsSchema.safeParse([{ id: "a_1", label: " ", price: 1 }]).success).toBe(false);
    expect(
      addonsSchema.safeParse([
        { id: "a_1", label: "x", price: 1 },
        { id: "a_1", label: "y", price: 2 },
      ]).success,
    ).toBe(false);
  });

  it("reads stored add-ons, dropping broken entries", () => {
    expect(parseAddons([offered[0], { id: "bad" }, "nope"])).toEqual([offered[0]]);
    expect(parseAddons(null)).toEqual([]);
  });
});
