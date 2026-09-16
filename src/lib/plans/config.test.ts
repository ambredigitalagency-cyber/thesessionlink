import { describe, expect, it } from "vitest";

import { PLAN_LIMITS, effectivePlan, isOnTrial, isWithinLimit, planLimits } from "./config";

const DAY = 86_400_000;

function profile(overrides: {
  plan_type?: "free" | "base" | "premium";
  trial_ends_at?: string;
  subscription_active?: boolean;
}) {
  return {
    plan_type: "base" as const,
    trial_ends_at: new Date(Date.now() + 7 * DAY).toISOString(),
    subscription_active: false,
    ...overrides,
  };
}

describe("effectivePlan", () => {
  it("keeps the stored plan while the trial is running", () => {
    expect(effectivePlan(profile({ plan_type: "base" }))).toBe("base");
    expect(effectivePlan(profile({ plan_type: "premium" }))).toBe("premium");
  });

  it("drops to free once the trial lapses without a subscription", () => {
    const lapsed = profile({ trial_ends_at: new Date(Date.now() - DAY).toISOString() });
    expect(effectivePlan(lapsed)).toBe("free");
  });

  /** expire_trials() only runs daily, so the column can still say "base". */
  it("ignores a stale plan_type left behind by a lapsed trial", () => {
    const stale = profile({
      plan_type: "premium",
      trial_ends_at: new Date(Date.now() - 30 * DAY).toISOString(),
    });
    expect(stale.plan_type).toBe("premium");
    expect(effectivePlan(stale)).toBe("free");
  });

  it("keeps the paid plan when a subscription is active, trial or not", () => {
    const subscribed = profile({
      plan_type: "premium",
      trial_ends_at: new Date(Date.now() - 30 * DAY).toISOString(),
      subscription_active: true,
    });
    expect(effectivePlan(subscribed)).toBe("premium");
  });
});

describe("isOnTrial", () => {
  it("is true only before the end date and without a subscription", () => {
    expect(isOnTrial(profile({}))).toBe(true);
    expect(isOnTrial(profile({ subscription_active: true }))).toBe(false);
    expect(isOnTrial(profile({ trial_ends_at: new Date(Date.now() - DAY).toISOString() }))).toBe(
      false,
    );
  });
});

describe("planLimits", () => {
  it("gives a lapsed trial the free limits", () => {
    const lapsed = profile({ trial_ends_at: new Date(Date.now() - DAY).toISOString() });
    expect(planLimits(lapsed)).toEqual(PLAN_LIMITS.free);
  });

  it("locks the CRM and reminders on free only", () => {
    expect(PLAN_LIMITS.free.crm).toBe(false);
    expect(PLAN_LIMITS.free.reminders).toBe(false);
    expect(PLAN_LIMITS.base.crm).toBe(true);
    expect(PLAN_LIMITS.premium.reminders).toBe(true);
  });

  it("matches the caps advertised on the pricing page", () => {
    expect(PLAN_LIMITS.free.maxOffers).toBe(1);
    expect(PLAN_LIMITS.free.maxPhotosPerOffer).toBe(1);
    expect(PLAN_LIMITS.base.maxOffers).toBeNull();
    expect(PLAN_LIMITS.base.maxPhotosPerOffer).toBe(5);
    expect(PLAN_LIMITS.premium.maxPhotosPerOffer).toBeNull();
  });
});

describe("isWithinLimit", () => {
  it("treats null as unlimited", () => {
    expect(isWithinLimit(999, null)).toBe(true);
  });

  it("allows exactly the limit, not one more", () => {
    expect(isWithinLimit(5, 5)).toBe(true);
    expect(isWithinLimit(6, 5)).toBe(false);
  });
});
