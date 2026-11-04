import { describe, expect, it } from "vitest";

import { publishableTestimonials, TESTIMONIALS } from "./testimonials";

describe("testimonials", () => {
  it("renders nothing while there are none", () => {
    expect(publishableTestimonials([])).toEqual([]);
  });

  it("keeps only complete entries, with a valid page link when there is one", () => {
    const entries = publishableTestimonials([
      { name: "A. B.", trade: "Coach", quote: "Une phrase assez longue." },
      { name: "C. D.", trade: "Coach", quote: "Une phrase assez longue.", slug: "c-d" },
      { name: "", trade: "Coach", quote: "Une phrase assez longue." },
      { name: "E. F.", trade: "Coach", quote: "Court" },
      { name: "G. H.", trade: "Coach", quote: "Une phrase assez longue.", slug: "../admin" },
      "not an object",
    ]);
    expect(entries.map((entry) => entry.name)).toEqual(["A. B.", "C. D."]);
  });

  it("only holds well-formed entries in the published list", () => {
    expect(publishableTestimonials(TESTIMONIALS)).toHaveLength(TESTIMONIALS.length);
  });
});
