import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  applyFilters,
  derivedStatus,
  hasActiveFilters,
  sortBookings,
  type FilterableBooking,
} from "./filters";

const NOW = new Date("2026-09-17T12:00:00Z").getTime();
const HOUR = 3_600_000;

function booking(overrides: Partial<FilterableBooking> & { id: string }): FilterableBooking {
  return {
    offer_title: "Personal training",
    action_type: "calendar_booking",
    client_name: "Julien Meyer",
    client_email: "julien@example.com",
    starts_at: new Date(NOW + HOUR).toISOString(),
    requested_date: null,
    status: "confirmed",
    created_at: new Date(NOW - 48 * HOUR).toISOString(),
    ...overrides,
  };
}

describe("derivedStatus", () => {
  it("calls a confirmed booking completed once its start is behind us", () => {
    const past = booking({ id: "a", starts_at: new Date(NOW - HOUR).toISOString() });
    expect(derivedStatus(past, NOW)).toBe("completed");
  });

  it("keeps a confirmed booking confirmed while it is still ahead", () => {
    expect(derivedStatus(booking({ id: "a" }), NOW)).toBe("confirmed");
  });

  it("never turns a pending or cancelled booking into completed", () => {
    const old = new Date(NOW - 10 * HOUR).toISOString();
    expect(derivedStatus(booking({ id: "a", status: "pending", starts_at: old }), NOW)).toBe(
      "pending",
    );
    expect(derivedStatus(booking({ id: "b", status: "cancelled", starts_at: old }), NOW)).toBe(
      "cancelled",
    );
  });

  it("treats an undated confirmed request as still confirmed", () => {
    const undated = booking({ id: "a", starts_at: null });
    expect(derivedStatus(undated, NOW)).toBe("confirmed");
  });
});

describe("applyFilters", () => {
  const rows = [
    booking({ id: "upcoming" }),
    booking({ id: "done", starts_at: new Date(NOW - HOUR).toISOString() }),
    booking({ id: "waiting", status: "pending" }),
    booking({ id: "off", status: "cancelled" }),
    booking({ id: "other-offer", offer_title: "Small group class" }),
    booking({ id: "quote", action_type: "quote_request", starts_at: null, requested_date: null }),
  ];

  it("returns everything when no criterion is set", () => {
    expect(applyFilters(rows, EMPTY_FILTERS, NOW)).toHaveLength(rows.length);
  });

  it("filters on the derived status, not the stored one", () => {
    const result = applyFilters(rows, { ...EMPTY_FILTERS, statuses: ["completed"] }, NOW);
    expect(result.map((row) => row.id)).toEqual(["done"]);
  });

  it("combines criteria, each one narrowing further", () => {
    const result = applyFilters(
      rows,
      { ...EMPTY_FILTERS, statuses: ["confirmed"], offers: ["Small group class"] },
      NOW,
    );
    expect(result.map((row) => row.id)).toEqual(["other-offer"]);
  });

  it("keeps a booking falling on the last day of the range", () => {
    const onTo = booking({ id: "edge", starts_at: new Date("2026-09-20T22:30:00Z").toISOString() });
    const result = applyFilters(
      [onTo],
      { ...EMPTY_FILTERS, from: "2026-09-18", to: "2026-09-20" },
      NOW,
    );
    expect(result).toHaveLength(1);
  });

  it("drops undated requests when a date range is asked for", () => {
    const result = applyFilters(rows, { ...EMPTY_FILTERS, from: "2026-09-01" }, NOW);
    expect(result.map((row) => row.id)).not.toContain("quote");
  });

  it("searches across client name, email and offer title", () => {
    expect(applyFilters(rows, { ...EMPTY_FILTERS, query: "small group" }, NOW)).toHaveLength(1);
    expect(applyFilters(rows, { ...EMPTY_FILTERS, query: "julien@" }, NOW)).toHaveLength(
      rows.length,
    );
    expect(applyFilters(rows, { ...EMPTY_FILTERS, query: "nobody" }, NOW)).toHaveLength(0);
  });
});

describe("hasActiveFilters", () => {
  it("ignores a query made only of spaces", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "   " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "a" })).toBe(true);
  });
});

describe("sortBookings", () => {
  const rows = [
    booking({ id: "c", client_name: "Chloé", starts_at: new Date(NOW + 3 * HOUR).toISOString() }),
    booking({ id: "a", client_name: "Ana", starts_at: new Date(NOW + HOUR).toISOString() }),
    booking({ id: "b", client_name: "Bruno", starts_at: null, requested_date: null }),
  ];

  it("orders by date and reverses on demand", () => {
    expect(sortBookings(rows, "date", "asc", NOW).map((row) => row.id)).toEqual(["a", "c", "b"]);
    expect(sortBookings(rows, "date", "desc", NOW).map((row) => row.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps undated bookings last in both directions", () => {
    expect(sortBookings(rows, "date", "asc", NOW).at(-1)?.id).toBe("b");
    expect(sortBookings(rows, "date", "desc", NOW).at(-1)?.id).toBe("b");
  });

  it("orders by client name", () => {
    expect(sortBookings(rows, "client", "asc", NOW).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("ranks statuses from most to least actionable", () => {
    const mixed = [
      booking({ id: "cancelled", status: "cancelled" }),
      booking({ id: "pending", status: "pending" }),
      booking({ id: "confirmed" }),
    ];
    expect(sortBookings(mixed, "status", "asc", NOW).map((row) => row.id)).toEqual([
      "pending",
      "confirmed",
      "cancelled",
    ]);
  });

  it("does not mutate the array it is given", () => {
    const original = [...rows];
    sortBookings(rows, "client", "asc", NOW);
    expect(rows).toEqual(original);
  });
});
