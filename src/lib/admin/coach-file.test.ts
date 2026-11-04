import { describe, expect, it } from "vitest";

import { profileCompleteness } from "./coach-file";
import { coachRef, matchesRef } from "./ref";

describe("coachRef", () => {
  it("is the first six hex digits, uppercased", () => {
    expect(coachRef("7a3f2c91-0b4d-4e8a-9f11-2c3d4e5f6a7b")).toBe("#7A3F2C");
  });

  it("matches a search with or without the hash, from three characters", () => {
    const id = "7a3f2c91-0b4d-4e8a-9f11-2c3d4e5f6a7b";
    expect(matchesRef(id, "#7a3f")).toBe(true);
    expect(matchesRef(id, "7A3F2C")).toBe(true);
    expect(matchesRef(id, "7a")).toBe(false);
    expect(matchesRef(id, "7a4")).toBe(false);
  });
});

describe("profileCompleteness", () => {
  it("lists what is missing in page order", () => {
    const result = profileCompleteness({
      avatar_url: "https://example.com/a.webp",
      headline: " ",
      bio: "Hello",
      location: null,
      phone_number: null,
      whatsapp_number: "+33600000000",
      social_links: { instagram: null },
      custom_fields: [],
      activeOffers: 0,
    });

    expect(result.missing).toEqual(["headline", "location", "socials", "details", "offer"]);
    expect(result.ratio).toBeCloseTo(3 / 8);
  });
});
