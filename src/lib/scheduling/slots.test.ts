import { describe, expect, it } from "vitest";

import {
  generateSlotGrid,
  generateSlots,
  isSlotBookable,
  localDateKey,
  rulesForOffer,
  withoutMinimumNotice,
  type AvailabilityRule,
  type SlotEngineInput,
} from "./slots";

const TZ = "Europe/Paris";
const OFFER = "offer-1";

const weekdayRules: AvailabilityRule[] = [1, 2, 3, 4, 5].map((weekday) => ({
  offer_id: null,
  weekday,
  start_time: "09:00:00",
  end_time: "12:00:00",
}));

function baseInput(overrides: Partial<SlotEngineInput> = {}): SlotEngineInput {
  // Thursday 2026-10-01, 07:00 Paris time.
  const now = new Date("2026-10-01T05:00:00Z");
  return {
    timezone: TZ,
    offerId: OFFER,
    rules: weekdayRules,
    durationMinutes: 60,
    minNoticeHours: 0,
    maxDaysAhead: 30,
    from: now,
    to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    now,
    ...overrides,
  };
}

function hours(slots: { start: Date }[]) {
  return slots.map((slot) => slot.start.toISOString());
}

describe("rulesForOffer", () => {
  it("prefers offer-specific rules over the profile default", () => {
    const rules: AvailabilityRule[] = [
      { offer_id: null, weekday: 4, start_time: "09:00:00", end_time: "12:00:00" },
      { offer_id: OFFER, weekday: 4, start_time: "14:00:00", end_time: "16:00:00" },
    ];
    expect(rulesForOffer(rules, OFFER)).toEqual([rules[1]]);
  });

  it("falls back to the default schedule", () => {
    const rules: AvailabilityRule[] = [
      { offer_id: null, weekday: 4, start_time: "09:00:00", end_time: "12:00:00" },
      { offer_id: "other", weekday: 4, start_time: "14:00:00", end_time: "16:00:00" },
    ];
    expect(rulesForOffer(rules, OFFER)).toEqual([rules[0]]);
  });
});

describe("generateSlots", () => {
  it("generates one slot per duration inside the window", () => {
    const slots = generateSlots(baseInput());
    expect(hours(slots)).toEqual([
      "2026-10-01T07:00:00.000Z", // 09:00 Paris
      "2026-10-01T08:00:00.000Z",
      "2026-10-01T09:00:00.000Z",
    ]);
  });

  it("respects a custom slot interval", () => {
    const slots = generateSlots(baseInput({ durationMinutes: 60, slotIntervalMinutes: 30 }));
    expect(slots).toHaveLength(5); // 9:00, 9:30, 10:00, 10:30, 11:00
  });

  it("never returns a slot that does not fully fit the window", () => {
    const slots = generateSlots(baseInput({ durationMinutes: 90 }));
    expect(hours(slots)).toEqual(["2026-10-01T07:00:00.000Z", "2026-10-01T08:30:00.000Z"]);
  });

  it("applies the minimum notice", () => {
    const slots = generateSlots(baseInput({ minNoticeHours: 4 }));
    // now = 07:00 Paris, so only 11:00 remains bookable.
    expect(hours(slots)).toEqual(["2026-10-01T09:00:00.000Z"]);
  });

  it("removes slots overlapping an existing booking, buffer included", () => {
    const busy = [
      { start: new Date("2026-10-01T08:00:00Z"), end: new Date("2026-10-01T09:00:00Z") },
    ];
    expect(hours(generateSlots(baseInput({ busy })))).toEqual([
      "2026-10-01T07:00:00.000Z",
      "2026-10-01T09:00:00.000Z",
    ]);

    // With a 15 min buffer the adjacent slots are gone too.
    expect(generateSlots(baseInput({ busy, bufferMinutes: 15 }))).toHaveLength(0);
  });

  it("skips days off", () => {
    const timeOff = [{ starts_on: "2026-10-01", ends_on: "2026-10-03" }];
    expect(generateSlots(baseInput({ timeOff }))).toHaveLength(0);
  });

  it("ignores weekdays without a rule", () => {
    const saturday = new Date("2026-10-03T05:00:00Z");
    const slots = generateSlots(
      baseInput({
        now: saturday,
        from: saturday,
        to: new Date(saturday.getTime() + 24 * 60 * 60 * 1000),
      }),
    );
    expect(slots).toHaveLength(0);
  });

  it("keeps wall-clock times stable across a DST transition", () => {
    // Paris switches to winter time on 2026-10-25.
    const from = new Date("2026-10-23T00:00:00Z");
    const slots = generateSlots(
      baseInput({
        now: from,
        from,
        to: new Date("2026-10-27T00:00:00Z"),
        maxDaysAhead: 30,
      }),
    );

    const firstByDay = new Map<string, Date>();
    for (const slot of slots) {
      const key = localDateKey(slot.start, TZ);
      if (!firstByDay.has(key)) firstByDay.set(key, slot.start);
    }

    // Friday (CEST) and Monday (CET) both start at 09:00 local.
    expect(firstByDay.get("2026-10-23")?.toISOString()).toBe("2026-10-23T07:00:00.000Z");
    expect(firstByDay.get("2026-10-26")?.toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });

  it("honours the booking horizon", () => {
    const now = new Date("2026-10-01T05:00:00Z");
    const slots = generateSlots(
      baseInput({
        now,
        from: now,
        to: new Date("2026-12-01T00:00:00Z"),
        maxDaysAhead: 2,
      }),
    );
    const days = new Set(slots.map((slot) => localDateKey(slot.start, TZ)));
    expect([...days]).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("supports windows that run to midnight", () => {
    const rules: AvailabilityRule[] = [
      { offer_id: null, weekday: 4, start_time: "22:00:00", end_time: "24:00:00" },
    ];
    const slots = generateSlots(baseInput({ rules, durationMinutes: 60 }));
    expect(hours(slots)).toEqual(["2026-10-01T20:00:00.000Z", "2026-10-01T21:00:00.000Z"]);
  });
});

describe("isSlotBookable", () => {
  it("accepts a slot the engine produced", () => {
    const input = baseInput();
    expect(isSlotBookable(input, new Date("2026-10-01T07:00:00.000Z"))).not.toBeNull();
  });

  it("rejects an off-grid start time", () => {
    const input = baseInput();
    expect(isSlotBookable(input, new Date("2026-10-01T07:15:00.000Z"))).toBeNull();
  });

  it("rejects a slot that someone else just took", () => {
    const input = baseInput({
      busy: [{ start: new Date("2026-10-01T07:00:00Z"), end: new Date("2026-10-01T08:00:00Z") }],
    });
    expect(isSlotBookable(input, new Date("2026-10-01T07:00:00.000Z"))).toBeNull();
  });
});

describe("generateSlotGrid", () => {
  const grid = (overrides: Partial<SlotEngineInput> = {}) =>
    generateSlotGrid(baseInput(overrides)).map((slot) => [
      slot.start.toISOString().slice(11, 16),
      slot.status,
    ]);

  it("keeps slots inside the minimum notice, marked unavailable", () => {
    // 09:00 Paris is 07:00 UTC, 2 hours after "now"; a 4-hour notice rules it out.
    expect(grid({ minNoticeHours: 4 })).toEqual([
      ["07:00", "unavailable"],
      ["08:00", "unavailable"],
      ["09:00", "available"],
    ]);
    expect(hours(generateSlots(baseInput({ minNoticeHours: 4 })))).toEqual([
      "2026-10-01T09:00:00.000Z",
    ]);
  });

  it("marks what a booking and its buffer cover, without saying why", () => {
    const busy = [
      { start: new Date("2026-10-01T08:00:00Z"), end: new Date("2026-10-01T09:00:00Z") },
    ];
    expect(grid({ busy, bufferMinutes: 15 })).toEqual([
      ["07:00", "unavailable"],
      ["08:00", "unavailable"],
      ["09:00", "unavailable"],
    ]);
    expect(grid({ busy })).toEqual([
      ["07:00", "available"],
      ["08:00", "unavailable"],
      ["09:00", "available"],
    ]);
  });

  it("never returns a slot that has already started", () => {
    const now = new Date("2026-10-01T07:30:00Z");
    expect(grid({ now, from: now })).toEqual([
      ["08:00", "available"],
      ["09:00", "available"],
    ]);
  });

  it("offers the same slots as the engine once nothing is blocked", () => {
    const open = generateSlotGrid(baseInput()).filter((slot) => slot.status === "available");
    expect(hours(open)).toEqual(hours(generateSlots(baseInput())));
  });
});

describe("withoutMinimumNotice", () => {
  // 09:00 Paris, two hours after "now" — inside a four-hour notice.
  const soon = new Date("2026-10-01T07:00:00.000Z");

  it("lets the pro reschedule inside the notice they ask of their clients", () => {
    const input = baseInput({ minNoticeHours: 4 });
    expect(isSlotBookable(input, soon)).toBeNull();
    expect(isSlotBookable(withoutMinimumNotice(input), soon)).not.toBeNull();
  });

  it("still keeps the buffer with the other bookings", () => {
    // Ends 15 minutes before the slot the pro is aiming for.
    const busy = [
      { start: new Date("2026-10-01T06:00:00Z"), end: new Date("2026-10-01T06:45:00Z") },
    ];
    const blocked = baseInput({ minNoticeHours: 4, busy, bufferMinutes: 30 });
    expect(isSlotBookable(withoutMinimumNotice(blocked), soon)).toBeNull();

    const roomy = baseInput({ minNoticeHours: 4, busy, bufferMinutes: 10 });
    expect(isSlotBookable(withoutMinimumNotice(roomy), soon)).not.toBeNull();
  });

  it("does not reach back into the past", () => {
    const now = new Date("2026-10-01T07:30:00Z");
    const input = baseInput({ now, from: now, minNoticeHours: 4 });
    expect(isSlotBookable(withoutMinimumNotice(input), soon)).toBeNull();
  });

  it("leaves the client-facing path alone", () => {
    const input = baseInput({ minNoticeHours: 4 });
    expect(input.minNoticeHours).toBe(4);
    expect(withoutMinimumNotice(input).minNoticeHours).toBe(0);
  });
});
