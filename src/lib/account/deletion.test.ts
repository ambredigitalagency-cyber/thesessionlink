import { describe, expect, it } from "vitest";

import { DELETION_GRACE_DAYS, deletionDaysLeft, deletionDueAt } from "./deletion";

const DAY = 86_400_000;
const NOW = new Date("2026-09-24T12:00:00Z");
const agoDays = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

describe("deletionDueAt", () => {
  it("falls one grace period after the request", () => {
    const due = deletionDueAt("2026-09-24T12:00:00Z");
    expect(due.toISOString()).toBe(
      new Date(NOW.getTime() + DELETION_GRACE_DAYS * DAY).toISOString(),
    );
  });
});

describe("deletionDaysLeft", () => {
  it("counts down from the full grace period", () => {
    expect(deletionDaysLeft(agoDays(0), NOW)).toBe(DELETION_GRACE_DAYS);
    expect(deletionDaysLeft(agoDays(10), NOW)).toBe(DELETION_GRACE_DAYS - 10);
  });

  it("rounds a part-day up, so the last day never reads as zero", () => {
    const almost = new Date(NOW.getTime() - (DELETION_GRACE_DAYS * DAY - 3600_000));
    expect(deletionDaysLeft(almost, NOW)).toBe(1);
  });

  it("never goes below zero once the purge is due", () => {
    expect(deletionDaysLeft(agoDays(DELETION_GRACE_DAYS), NOW)).toBe(0);
    expect(deletionDaysLeft(agoDays(DELETION_GRACE_DAYS + 5), NOW)).toBe(0);
  });
});
