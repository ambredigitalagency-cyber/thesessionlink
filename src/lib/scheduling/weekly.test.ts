import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEEK,
  compactRange,
  copyToOpenDays,
  minutesOpen,
  nextRange,
  openingRanges,
  sameWeek,
  toWeekHours,
  toWeeklyRules,
  weekProblem,
} from "./weekly";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

describe("weekly hours", () => {
  it("starts on the schedule the database gives a new profile", () => {
    expect(Object.keys(DEFAULT_WEEK).map(Number)).toEqual([1, 2, 3, 4, 5]);
    expect(minutesOpen(DEFAULT_WEEK)).toBe(5 * 8 * 60);
  });

  it("reads rules back into days and writes them out unchanged", () => {
    const rules = [
      { weekday: 2, start_time: "14:00:00", end_time: "18:00:00" },
      { weekday: 2, start_time: "09:00:00", end_time: "12:00:00" },
      { weekday: 6, start_time: "10:00:00", end_time: "23:59:00" },
    ];
    const week = toWeekHours(rules);
    expect(week[2]).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "14:00", end: "18:00" },
    ]);
    expect(sameWeek(toWeekHours(toWeeklyRules(week)), week)).toBe(true);
    expect(minutesOpen(week)).toBe(3 * 60 + 4 * 60 + 14 * 60);
  });

  it("refuses an empty range and two ranges sharing a minute", () => {
    expect(weekProblem({ 1: [{ start: "10:00", end: "10:00" }] })).toBe("end_before_start");
    expect(
      weekProblem({
        1: [
          { start: "09:00", end: "12:00" },
          { start: "11:30", end: "14:00" },
        ],
      }),
    ).toBe("overlap");
    expect(weekProblem(DEFAULT_WEEK)).toBeNull();
  });

  it("opens a day with the hours of the first open one", () => {
    const week = { 2: [{ start: "07:00", end: "13:00" }], 4: [{ start: "10:00", end: "20:00" }] };
    expect(openingRanges(week, ORDER)).toEqual([{ start: "07:00", end: "13:00" }]);
    expect(openingRanges({}, ORDER)).toEqual([{ start: "09:00", end: "17:00" }]);
  });

  it("copies one day onto the open days only", () => {
    const week = {
      1: [{ start: "08:00", end: "12:00" }],
      3: [{ start: "09:00", end: "17:00" }],
      6: [],
    };
    const copied = copyToOpenDays(week, 1);
    expect(copied[3]).toEqual([{ start: "08:00", end: "12:00" }]);
    expect(copied[6]).toEqual([]);
  });

  it("places a second range after the last and keeps it inside the day", () => {
    expect(nextRange([{ start: "09:00", end: "12:00" }])).toEqual({ start: "13:00", end: "15:00" });
    expect(nextRange([{ start: "20:00", end: "23:30" }]).end).toBe("23:45");
  });

  it("writes a range short enough for a day card", () => {
    expect(compactRange({ start: "09:00", end: "17:00" })).toBe("9–17");
    expect(compactRange({ start: "09:30", end: "17:45" })).toBe("9:30–17:45");
    expect(compactRange({ start: "00:00", end: "23:59" })).toBe("0–24");
  });
});
