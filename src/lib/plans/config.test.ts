import { describe, expect, it } from "vitest";

import { isOnTrial, trialDaysLeft } from "./config";

const DAY = 86_400_000;

function profile(overrides: { trial_ends_at?: string; subscription_active?: boolean }) {
  return {
    trial_ends_at: new Date(Date.now() + 7 * DAY).toISOString(),
    subscription_active: false,
    ...overrides,
  };
}

describe("isOnTrial", () => {
  it("is true only before the end date and without a subscription", () => {
    expect(isOnTrial(profile({}))).toBe(true);
    expect(isOnTrial(profile({ subscription_active: true }))).toBe(false);
    expect(isOnTrial(profile({ trial_ends_at: new Date(Date.now() - DAY).toISOString() }))).toBe(
      false,
    );
  });
});

describe("trialDaysLeft", () => {
  it("rounds a partial day up", () => {
    expect(
      trialDaysLeft(profile({ trial_ends_at: new Date(Date.now() + DAY / 2).toISOString() })),
    ).toBe(1);
  });

  it("never goes below zero", () => {
    expect(
      trialDaysLeft(profile({ trial_ends_at: new Date(Date.now() - DAY).toISOString() })),
    ).toBe(0);
  });
});
