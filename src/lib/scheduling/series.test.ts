import { describe, expect, it } from "vitest";

import { occurrences } from "./series";

const iso = (dates: Date[]) => dates.map((date) => date.toISOString());

describe("occurrences", () => {
  it("repeats weekly on the coach's wall clock, across a DST change", () => {
    // Tuesday 20 October 2026, 18:00 in Paris (UTC+2); clocks go back on the 25th.
    const first = new Date("2026-10-20T16:00:00Z");
    expect(iso(occurrences(first, "Europe/Paris", "weekly", 3))).toEqual([
      "2026-10-20T16:00:00.000Z",
      "2026-10-27T17:00:00.000Z", // still 18:00 in Paris, now UTC+1
      "2026-11-03T17:00:00.000Z",
    ]);
  });

  it("repeats every other week", () => {
    const first = new Date("2026-11-03T17:00:00Z");
    expect(iso(occurrences(first, "Europe/Paris", "biweekly", 2))).toEqual([
      "2026-11-03T17:00:00.000Z",
      "2026-11-17T17:00:00.000Z",
    ]);
  });

  it("repeats monthly on the same day, the month's last day when it is shorter", () => {
    const first = new Date("2027-01-31T09:00:00Z"); // 10:00 in Paris
    expect(iso(occurrences(first, "Europe/Paris", "monthly", 3))).toEqual([
      "2027-01-31T09:00:00.000Z",
      "2027-02-28T09:00:00.000Z",
      "2027-03-31T08:00:00.000Z", // 10:00 in Paris, summer time since the 28th
    ]);
  });

  it("never goes beyond twelve sessions", () => {
    expect(occurrences(new Date(), "UTC", "weekly", 40)).toHaveLength(12);
  });
});
