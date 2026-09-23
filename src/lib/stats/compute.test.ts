import { describe, expect, it } from "vitest";

import {
  bucketKey,
  computeStats,
  granularityFor,
  openMinutesBetween,
  rangeStart,
  type StatsBooking,
  type StatsOffer,
} from "./compute";

const TZ = "Europe/Paris";
// Wednesday 2026-10-14, 12:00 Paris.
const NOW = new Date("2026-10-14T10:00:00Z");
const DAY = 86_400_000;

const offers: StatsOffer[] = [
  { id: "coaching", price: 60, price_type: "fixed" },
  { id: "discovery", price: 0, price_type: "free" },
  { id: "programme", price: 540, price_type: "from" },
  { id: "quote", price: 200, price_type: "on_request" },
];

const titles = new Map([
  ["coaching", "Coaching"],
  ["discovery", "Découverte"],
  ["programme", "Programme"],
  ["quote", "Sur devis"],
]);

function booking(overrides: Partial<StatsBooking> = {}): StatsBooking {
  return {
    offer_id: "coaching",
    offer_title: "Coaching",
    status: "confirmed",
    quantity: 1,
    starts_at: null,
    ends_at: null,
    created_at: new Date(NOW.getTime() - DAY).toISOString(),
    no_show: false,
    ...overrides,
  };
}

function stats(
  bookings: StatsBooking[],
  overrides: Partial<Parameters<typeof computeStats>[0]> = {},
) {
  return computeStats({
    bookings,
    offers,
    offerTitles: titles,
    windows: [],
    timeOff: [],
    timezone: TZ,
    range: "30d",
    now: NOW,
    ...overrides,
  });
}

describe("ranges and buckets", () => {
  it("falls back to the first booking for the all-time range", () => {
    const first = new Date("2026-01-05T09:00:00Z");
    expect(rangeStart("all", NOW, first)).toEqual(first);
    expect(rangeStart("7d", NOW, first).toISOString()).toBe("2026-10-07T10:00:00.000Z");
  });

  it("widens the bucket as the window grows", () => {
    expect(granularityFor(new Date(NOW.getTime() - 7 * DAY), NOW)).toBe("day");
    expect(granularityFor(new Date(NOW.getTime() - 90 * DAY), NOW)).toBe("week");
    expect(granularityFor(new Date(NOW.getTime() - 400 * DAY), NOW)).toBe("month");
  });

  it("keys weeks on their Monday, in the pro's timezone", () => {
    // Sunday 2026-10-11 23:30 UTC is already Monday the 12th in Paris.
    const sundayLate = new Date("2026-10-11T23:30:00Z");
    expect(bucketKey(sundayLate, "week", TZ)).toBe("2026-10-12");
    expect(bucketKey(new Date("2026-10-14T10:00:00Z"), "week", TZ)).toBe("2026-10-12");
    expect(bucketKey(new Date("2026-10-14T10:00:00Z"), "day", TZ)).toBe("2026-10-14");
    expect(bucketKey(new Date("2026-10-14T10:00:00Z"), "month", TZ)).toBe("2026-10");
  });

  it("counts each booking in the bucket it was received in", () => {
    const result = stats([
      booking({ created_at: "2026-10-13T08:00:00Z" }),
      booking({ created_at: "2026-10-13T16:00:00Z" }),
      booking({ created_at: "2026-10-10T08:00:00Z" }),
    ]);
    const filled = result.buckets.filter((bucket) => bucket.bookings > 0);
    expect(filled.map((bucket) => [bucket.key, bucket.bookings])).toEqual([
      ["2026-10-10", 1],
      ["2026-10-13", 2],
    ]);
  });

  it("ignores what falls outside the window", () => {
    const old = booking({ created_at: new Date(NOW.getTime() - 60 * DAY).toISOString() });
    expect(stats([old, booking()]).totals.bookings).toBe(1);
  });
});

describe("revenue", () => {
  it("counts confirmed bookings at the offer's price, quantity included", () => {
    const result = stats([booking(), booking({ quantity: 3 }), booking({ offer_id: "programme" })]);
    expect(result.totals.revenue).toBe(60 + 180 + 540);
  });

  it("leaves out what carries no amount", () => {
    const result = stats([
      booking({ status: "pending" }),
      booking({ status: "cancelled" }),
      booking({ offer_id: "discovery" }),
      booking({ offer_id: "quote" }),
      booking({ offer_id: null, offer_title: "Offre supprimée" }),
    ]);
    expect(result.totals.revenue).toBe(0);
    expect(result.totals.bookings).toBe(5);
  });
});

describe("fill rate", () => {
  const windows = [
    { weekday: 1, start_time: "09:00:00", end_time: "12:00:00" },
    { weekday: 2, start_time: "09:00:00", end_time: "12:00:00" },
  ];

  it("merges overlapping windows instead of counting a morning twice", () => {
    const overlapping = [
      { weekday: 1, start_time: "09:00:00", end_time: "12:00:00" },
      { weekday: 1, start_time: "11:00:00", end_time: "13:00:00" },
    ];
    const week = openMinutesBetween(
      overlapping,
      [],
      new Date("2026-10-05T00:00:00Z"),
      new Date("2026-10-12T00:00:00Z"),
      TZ,
    );
    expect(week).toBe(4 * 60);
  });

  it("drops the days the pro is off", () => {
    const from = new Date("2026-10-05T00:00:00Z");
    const to = new Date("2026-10-12T00:00:00Z");
    expect(openMinutesBetween(windows, [], from, to, TZ)).toBe(6 * 60);
    expect(
      openMinutesBetween(
        windows,
        [{ starts_on: "2026-10-06", ends_on: "2026-10-06" }],
        from,
        to,
        TZ,
      ),
    ).toBe(3 * 60);
  });

  it("is the share of open time actually booked, cancelled sessions aside", () => {
    const held = (day: string, hours: number) =>
      booking({
        starts_at: `${day}T07:00:00Z`,
        ends_at: `${day}T0${7 + hours}:00:00Z`,
        created_at: `${day}T06:00:00Z`,
      });

    const result = stats(
      [held("2026-10-12", 1), { ...held("2026-10-13", 1), status: "cancelled" }],
      {
        range: "7d",
        windows: [
          { weekday: 1, start_time: "09:00:00", end_time: "11:00:00" },
          { weekday: 2, start_time: "09:00:00", end_time: "11:00:00" },
        ],
      },
    );

    // Monday and Tuesday open two hours each; one of the two hours booked is cancelled.
    expect(result.totals.openMinutes).toBe(240);
    expect(result.totals.bookedMinutes).toBe(60);
    expect(result.totals.fillRate).toBeCloseTo(0.25);
  });

  it("has no rate at all when no hours are set", () => {
    expect(stats([booking()]).totals.fillRate).toBeNull();
  });
});

describe("sessions lost", () => {
  it("reports the share of the period's bookings that were cancelled", () => {
    const result = stats([
      booking(),
      booking(),
      booking({ status: "cancelled" }),
      booking({ status: "cancelled" }),
    ]);
    expect(result.totals.cancelled).toBe(2);
    expect(result.totals.cancellationRate).toBe(0.5);
    expect(stats([]).totals.cancellationRate).toBe(0);
  });

  it("counts absences beside cancellations, each cause kept apart", () => {
    const result = stats([
      booking(),
      booking(),
      booking({ no_show: true }),
      booking({ status: "cancelled" }),
    ]);
    expect(result.totals.noShow).toBe(1);
    expect(result.totals.cancelled).toBe(1);
    expect(result.totals.missed).toBe(2);
    expect(result.totals.missedRate).toBe(0.5);
    expect(result.totals.cancellationRate).toBe(0.25);
  });

  it("counts a booking cancelled after being marked absent only once", () => {
    const result = stats([booking(), booking({ status: "cancelled", no_show: true })]);
    expect(result.totals.cancelled).toBe(1);
    expect(result.totals.noShow).toBe(0);
    expect(result.totals.missed).toBe(1);
    expect(result.totals.missedRate).toBe(0.5);
  });

  it("leaves an absence out of the revenue it never earned", () => {
    // The session was confirmed, so it still counts as declared revenue: the
    // pro may well charge it. The rate is what flags the problem.
    const result = stats([booking({ no_show: true })]);
    expect(result.totals.revenue).toBe(60);
    expect(result.totals.missedRate).toBe(1);
  });

  it("ranks offers by volume and names them from the offer list", () => {
    const result = stats([
      booking({ offer_id: "programme" }),
      booking({ offer_id: "programme" }),
      booking({ offer_id: "coaching" }),
    ]);
    expect(result.offers.map((offer) => [offer.label, offer.bookings])).toEqual([
      ["Programme", 2],
      ["Coaching", 1],
    ]);
    expect(result.offers[0].share).toBeCloseTo(2 / 3);
  });

  it("folds everything past the fifth offer into one slice", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      booking({ offer_id: null, offer_title: `Offre ${index}` }),
    );
    const result = stats(many);
    expect(result.offers).toHaveLength(6);
    expect(result.offers[5].id).toBe("other");
    expect(result.offers[5].bookings).toBe(3);
  });

  it("keeps the title of an offer that no longer exists", () => {
    const result = stats([booking({ offer_id: null, offer_title: "Offre supprimée" })]);
    expect(result.offers[0].label).toBe("Offre supprimée");
  });
});
