import { describe, expect, it } from "vitest";

import { accountStatus, platformTotals, signupsByMonth, trialDaysLeft } from "./status";

const NOW = new Date("2026-09-24T12:00:00Z");
const DAY = 86_400_000;
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

const account = (overrides: Partial<Parameters<typeof accountStatus>[0]> = {}) => ({
  trial_ends_at: inDays(5),
  subscription_active: false,
  suspended_at: null,
  ...overrides,
});

describe("accountStatus", () => {
  it("reads a running trial, a subscription and a lapsed account", () => {
    expect(accountStatus(account(), NOW)).toBe("trial");
    expect(accountStatus(account({ subscription_active: true }), NOW)).toBe("subscribed");
    expect(accountStatus(account({ trial_ends_at: inDays(-1) }), NOW)).toBe("expired");
  });

  it("puts suspension above everything else", () => {
    const suspended = account({ subscription_active: true, suspended_at: inDays(-2) });
    expect(accountStatus(suspended, NOW)).toBe("suspended");
  });

  it("counts the days left, never below zero", () => {
    expect(trialDaysLeft(account({ trial_ends_at: inDays(3) }), NOW)).toBe(3);
    expect(trialDaysLeft(account({ trial_ends_at: inDays(-3) }), NOW)).toBe(0);
    expect(trialDaysLeft(account({ trial_ends_at: null }), NOW)).toBe(0);
  });
});

describe("platformTotals", () => {
  const options = { monthlyPrice: 9, locale: "fr", now: NOW, unknownLabel: "Sans catégorie" };

  it("counts each account once and prices the subscribers", () => {
    const totals = platformTotals(
      [
        { ...account({ subscription_active: true }), category_name: { fr: "Coach sportif" } },
        { ...account({ subscription_active: true }), category_name: { fr: "Coach sportif" } },
        { ...account(), category_name: { fr: "Coiffeur" } },
        { ...account({ trial_ends_at: inDays(-10) }), category_name: null },
        { ...account({ suspended_at: inDays(-1) }), category_name: { fr: "Coiffeur" } },
      ],
      options,
    );

    expect(totals.coaches).toBe(5);
    expect(totals.byStatus).toEqual({ subscribed: 2, trial: 1, expired: 1, suspended: 1 });
    expect(totals.monthlyRevenue).toBe(18);
  });

  it("ranks the categories and names the ones that have none", () => {
    const totals = platformTotals(
      [
        { ...account(), category_name: { fr: "Coiffeur", en: "Hairdresser" } },
        { ...account(), category_name: { fr: "Coiffeur", en: "Hairdresser" } },
        { ...account(), category_name: { en: "Life coach" } },
        { ...account(), category_name: null },
      ],
      options,
    );

    expect(totals.categories).toEqual([
      { label: "Coiffeur", count: 2 },
      { label: "Life coach", count: 1 },
      { label: "Sans catégorie", count: 1 },
    ]);
  });

  it("has no revenue and no categories without accounts", () => {
    const totals = platformTotals([], options);
    expect(totals.coaches).toBe(0);
    expect(totals.monthlyRevenue).toBe(0);
    expect(totals.categories).toEqual([]);
  });
});

describe("signupsByMonth", () => {
  it("returns one bucket per month, oldest first, zeros included", () => {
    const buckets = signupsByMonth(
      [
        { created_at: "2026-09-01T10:00:00Z" },
        { created_at: "2026-09-20T10:00:00Z" },
        { created_at: "2026-07-15T10:00:00Z" },
      ],
      3,
      NOW,
    );

    expect(buckets).toEqual([
      { key: "2026-07", count: 1 },
      { key: "2026-08", count: 0 },
      { key: "2026-09", count: 2 },
    ]);
  });

  it("ignores what falls outside the window", () => {
    const buckets = signupsByMonth([{ created_at: "2025-01-05T10:00:00Z" }], 3, NOW);
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true);
  });
});
