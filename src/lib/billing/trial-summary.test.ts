import { describe, expect, it } from "vitest";

import { summarizeTrial } from "./trial-summary";

describe("trial summary", () => {
  it("shows the real figures", () => {
    expect(summarizeTrial({ views: 7, clicks: 4, contacts: 2 })).toEqual({
      kind: "figures",
      views: 7,
      clicks: 4,
      contacts: 2,
    });
  });

  it("reads numbers sent as strings (bigint counts)", () => {
    expect(summarizeTrial({ views: "12", clicks: "0", contacts: "1" })).toMatchObject({
      views: 12,
      contacts: 1,
    });
  });

  it("never shows a row of zeros", () => {
    expect(summarizeTrial({ views: 0, clicks: 0, contacts: 0 })).toEqual({ kind: "empty" });
    expect(summarizeTrial(null)).toEqual({ kind: "empty" });
    expect(summarizeTrial({ views: -3, clicks: "x" })).toEqual({ kind: "empty" });
  });
});
