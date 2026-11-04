import { describe, expect, it } from "vitest";

import { DEMO_TRADES, demoPage } from "./landing-demo";

describe("the landing's live demo", () => {
  for (const trade of DEMO_TRADES) {
    for (const locale of ["fr", "en"]) {
      it(`renders every block of the ${trade} example (${locale})`, () => {
        const page = demoPage(trade, locale);
        // Every block passes the same validation as a real page: none is dropped.
        expect(page.blocks.length).toBe(3);
        expect(page.profile.display_name.length).toBeGreaterThan(1);
      });
    }
  }

  it("never shows blocks that would read as reviews or performance claims", () => {
    for (const trade of DEMO_TRADES) {
      const types = demoPage(trade, "fr").blocks.map((block) => block.type);
      expect(types).not.toContain("reviews");
      expect(types).not.toContain("stats");
    }
  });
});
