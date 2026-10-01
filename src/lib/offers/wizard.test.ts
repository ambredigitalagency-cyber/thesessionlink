import { describe, expect, it } from "vitest";

import { ACTION_TYPES } from "./schema";
import { offerPhasesFor } from "./wizard";

describe("offer builder questions", () => {
  it("asks for the hours right after the action, for a calendar offer in onboarding", () => {
    expect(offerPhasesFor(true, "calendar_booking")).toEqual([
      "action",
      "hours",
      "basics",
      "settings",
      "details",
      "photos",
      "review",
    ]);
  });

  it("never asks for hours for the four other action types", () => {
    for (const actionType of ACTION_TYPES.filter((type) => type !== "calendar_booking")) {
      expect(offerPhasesFor(true, actionType)).not.toContain("hours");
    }
  });

  it("never asks for hours where it is not told to (the dashboard)", () => {
    for (const actionType of ACTION_TYPES) {
      expect(offerPhasesFor(false, actionType)).not.toContain("hours");
    }
  });
});
