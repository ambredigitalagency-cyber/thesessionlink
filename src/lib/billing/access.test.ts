import { describe, expect, it } from "vitest";

import { accessEndsAt, accessState, isLocked, offlineAt } from "./access";
import { ACCESS_MATRIX, NOW } from "./access-matrix";

describe("access state (app)", () => {
  for (const { name, fields, expected } of ACCESS_MATRIX) {
    it(name, () => {
      expect(accessState(fields, NOW)).toBe(expected);
    });
  }

  it("locks the dashboard in grace and expired only", () => {
    expect(isLocked("trial")).toBe(false);
    expect(isLocked("subscribed")).toBe(false);
    expect(isLocked("grace")).toBe(true);
    expect(isLocked("expired")).toBe(true);
  });

  it("dates the page going offline 7 days after the later end", () => {
    const fields = {
      trial_ends_at: "2026-10-01T00:00:00Z",
      subscription_active: false,
      subscription_ended_at: "2026-10-20T00:00:00Z",
    };
    expect(accessEndsAt(fields)?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(offlineAt(fields)?.toISOString()).toBe("2026-10-27T00:00:00.000Z");
  });

  it("restores everything the moment a subscription is active again", () => {
    expect(
      accessState(
        {
          trial_ends_at: "2026-01-01T00:00:00Z",
          subscription_active: true,
          subscription_ended_at: null,
        },
        NOW,
      ),
    ).toBe("subscribed");
  });
});
