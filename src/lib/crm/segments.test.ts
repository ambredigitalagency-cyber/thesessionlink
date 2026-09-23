import { describe, expect, it } from "vitest";

import {
  SEGMENT_RULES,
  normaliseTags,
  segmentsByClient,
  segmentsFor,
  tagVocabulary,
  topSpenderThreshold,
  type SegmentInput,
} from "./segments";

const NOW = new Date("2026-09-23T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

function client(overrides: Partial<SegmentInput> = {}): SegmentInput {
  return {
    bookings_count: 3,
    recent_bookings_count: 3,
    last_booking_at: daysAgo(10),
    spent: 0,
    ...overrides,
  };
}

describe("segmentsFor", () => {
  it("calls a client loyal at the booking threshold, not below it", () => {
    const below = client({ recent_bookings_count: SEGMENT_RULES.loyalBookings - 1 });
    const at = client({ recent_bookings_count: SEGMENT_RULES.loyalBookings });
    expect(segmentsFor(below, { now: NOW })).not.toContain("loyal");
    expect(segmentsFor(at, { now: NOW })).toContain("loyal");
  });

  it("calls a client inactive once the last booking is old enough", () => {
    const recent = client({ last_booking_at: daysAgo(SEGMENT_RULES.inactiveDays - 1) });
    const old = client({ last_booking_at: daysAgo(SEGMENT_RULES.inactiveDays + 1) });
    expect(segmentsFor(recent, { now: NOW })).not.toContain("inactive");
    expect(segmentsFor(old, { now: NOW })).toContain("inactive");
  });

  it("never calls someone who never booked inactive", () => {
    const fresh = client({ bookings_count: 0, recent_bookings_count: 0, last_booking_at: null });
    expect(segmentsFor(fresh, { now: NOW })).toEqual([]);
  });

  it("only flags a top spender when a threshold was worked out", () => {
    const rich = client({ spent: 900 });
    expect(segmentsFor(rich, { now: NOW, topSpenderFrom: null })).not.toContain("top_spender");
    expect(segmentsFor(rich, { now: NOW, topSpenderFrom: 500 })).toContain("top_spender");
    expect(segmentsFor(client({ spent: 0 }), { now: NOW, topSpenderFrom: 0 })).not.toContain(
      "top_spender",
    );
  });

  it("can hold several segments at once", () => {
    const both = client({
      recent_bookings_count: 9,
      last_booking_at: daysAgo(120),
      spent: 800,
    });
    expect(segmentsFor(both, { now: NOW, topSpenderFrom: 500 })).toEqual([
      "loyal",
      "inactive",
      "top_spender",
    ]);
  });
});

describe("topSpenderThreshold", () => {
  it("stays silent while too few clients have paid anything", () => {
    expect(topSpenderThreshold([])).toBeNull();
    expect(topSpenderThreshold([100, 200, 0, 0])).toBeNull();
  });

  it("cuts at the best fifth of the paying clients", () => {
    // Ten payers: the top 20% is the two best, so the cut is the second one.
    const spends = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(topSpenderThreshold(spends)).toBe(900);
  });

  it("keeps at least one client above the cut", () => {
    expect(topSpenderThreshold([100, 200, 300])).toBe(300);
  });

  it("ignores clients who never paid when ranking", () => {
    expect(topSpenderThreshold([0, 0, 0, 10, 20, 30])).toBe(30);
  });
});

describe("segmentsByClient", () => {
  it("ranks the whole list in one pass", () => {
    const clients = [
      { id: "a", ...client({ spent: 1000 }) },
      { id: "b", ...client({ spent: 500 }) },
      { id: "c", ...client({ spent: 100 }) },
      { id: "d", ...client({ spent: 0, recent_bookings_count: 8 }) },
    ];
    const result = segmentsByClient(clients, NOW);
    expect(result.get("a")).toContain("top_spender");
    expect(result.get("b")).not.toContain("top_spender");
    expect(result.get("d")).toEqual(["loyal"]);
  });
});

describe("tags", () => {
  it("collects the vocabulary across clients, sorted and deduplicated", () => {
    expect(tagVocabulary([{ tags: ["VIP", "débutant"] }, { tags: ["VIP", "entreprise"] }])).toEqual(
      ["débutant", "entreprise", "VIP"],
    );
  });

  it("trims, drops blanks and keeps one of each spelling", () => {
    expect(normaliseTags([" VIP ", "vip", "", "   ", "Débutant"])).toEqual(["VIP", "Débutant"]);
  });

  it("caps what one client can carry", () => {
    const many = Array.from({ length: 30 }, (_, index) => `tag-${index}`);
    expect(normaliseTags(many)).toHaveLength(20);
  });
});
