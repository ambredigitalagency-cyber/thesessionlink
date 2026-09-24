import { localDateKey, localParts } from "@/lib/scheduling/slots";

/**
 * Dashboard statistics.
 *
 * Pure functions over rows the page already has to load: no SQL views, no
 * client-side recomputation. The page runs this once per request and hands the
 * charts finished numbers.
 *
 * Two honest limits, surfaced in the UI rather than hidden here:
 *  - revenue is declarative. No payment is tracked in the product, so it is the
 *    offer's price times the confirmed bookings, nothing more.
 *  - the fill rate compares booked time against *today's* opening hours. A pro
 *    who widened their week last month will see the older weeks look emptier.
 */

export const STATS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export function isStatsRange(value: unknown): value is StatsRange {
  return typeof value === "string" && STATS_RANGES.includes(value as StatsRange);
}

export type StatsBooking = {
  offer_id: string | null;
  offer_title: string;
  status: "pending" | "confirmed" | "cancelled";
  quantity: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  no_show: boolean;
  /** Set only when the client paid online; cash and transfers stay "none". */
  payment_status?: string | null;
  payment_amount_cents?: number | null;
  payment_currency?: string | null;
};

export type StatsOffer = {
  id: string;
  price: number | null;
  price_type: "fixed" | "from" | "free" | "on_request";
};

export type OpeningWindow = { weekday: number; start_time: string; end_time: string };
export type TimeOffRange = { starts_on: string; ends_on: string };

export type Bucket = { key: string; start: Date; end: Date; bookings: number; revenue: number };

export type OfferShare = { id: string; label: string; bookings: number; share: number };

export type Stats = {
  from: Date;
  to: Date;
  granularity: "day" | "week" | "month";
  buckets: Bucket[];
  totals: {
    bookings: number;
    confirmed: number;
    cancelled: number;
    /** Confirmed sessions the client never showed up to. */
    noShow: number;
    /** Cancellations and absences together, each row counted once. */
    missed: number;
    /** Declarative: offer price × confirmed bookings. */
    revenue: number;
    /**
     * Actually collected: the sum of payments the gateways confirmed.
     *
     * A different question from `revenue`, not a better answer to the same
     * one — most sessions are still settled in person, and those are real
     * money that no gateway will ever report.
     */
    collected: number;
    /** 0–1, or null when the pro has no opening hours to measure against. */
    fillRate: number | null;
    /** 0–1 of the period's bookings that ended up cancelled. */
    cancellationRate: number;
    /** 0–1 of the period's bookings lost to a cancellation or an absence. */
    missedRate: number;
    bookedMinutes: number;
    openMinutes: number;
  };
  offers: OfferShare[];
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Beyond this many offers the tail is folded together — more hues would not be readable. */
const MAX_OFFER_SLICES = 5;

function minutesOfDay(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function rangeStart(range: StatsRange, now: Date, earliest: Date | null): Date {
  if (range === "all") return earliest ?? new Date(now.getTime() - 30 * DAY);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * DAY);
}

export function granularityFor(from: Date, to: Date): Stats["granularity"] {
  const days = (to.getTime() - from.getTime()) / DAY;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

/** Bucket key of an instant, in the pro's timezone. */
export function bucketKey(date: Date, granularity: Stats["granularity"], timezone: string): string {
  const key = localDateKey(date, timezone);
  if (granularity === "month") return key.slice(0, 7);
  if (granularity === "day") return key;

  // Weeks are keyed by their Monday, so a bucket is stable whatever the day.
  const { weekday } = localParts(date, timezone);
  const backToMonday = (weekday + 6) % 7;
  return localDateKey(new Date(date.getTime() - backToMonday * DAY), timezone);
}

function emptyBuckets(
  from: Date,
  to: Date,
  granularity: Stats["granularity"],
  timezone: string,
): Bucket[] {
  const buckets: Bucket[] = [];
  const seen = new Set<string>();

  for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += DAY) {
    const date = new Date(cursor);
    const key = bucketKey(date, granularity, timezone);
    if (seen.has(key)) continue;
    seen.add(key);
    buckets.push({ key, start: date, end: date, bookings: 0, revenue: 0 });
  }

  return buckets;
}

/** What one confirmed booking is worth, as declared by its offer's price. */
export function bookingValue(booking: StatsBooking, offers: Map<string, StatsOffer>): number {
  if (booking.status !== "confirmed") return 0;
  const offer = booking.offer_id ? offers.get(booking.offer_id) : undefined;
  if (!offer || offer.price === null) return 0;
  // "Free" and "on request" carry no amount to count.
  if (offer.price_type !== "fixed" && offer.price_type !== "from") return 0;
  return offer.price * Math.max(1, booking.quantity);
}

/**
 * Minutes the pro is open between two instants, from their weekly schedule.
 * Overlapping windows on the same weekday are merged, so two offers sharing a
 * morning do not count that morning twice.
 */
export function openMinutesBetween(
  windows: OpeningWindow[],
  timeOff: TimeOffRange[],
  from: Date,
  to: Date,
  timezone: string,
): number {
  if (windows.length === 0 || to <= from) return 0;

  const merged = new Map<number, [number, number][]>();
  for (const window of windows) {
    const list = merged.get(window.weekday) ?? [];
    list.push([minutesOfDay(window.start_time), minutesOfDay(window.end_time)]);
    merged.set(window.weekday, list);
  }

  const perWeekday = new Map<number, number>();
  for (const [weekday, ranges] of merged) {
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [openFrom, openTo] = sorted[0];

    for (const [start, end] of sorted.slice(1)) {
      if (start <= openTo) {
        openTo = Math.max(openTo, end);
      } else {
        total += openTo - openFrom;
        [openFrom, openTo] = [start, end];
      }
    }

    perWeekday.set(weekday, total + (openTo - openFrom));
  }

  let minutes = 0;
  for (let cursor = from.getTime(); cursor < to.getTime(); cursor += DAY) {
    const date = new Date(cursor);
    const dateKey = localDateKey(date, timezone);
    if (timeOff.some((range) => dateKey >= range.starts_on && dateKey <= range.ends_on)) continue;
    minutes += perWeekday.get(localParts(date, timezone).weekday) ?? 0;
  }

  return minutes;
}

export function computeStats(input: {
  bookings: StatsBooking[];
  offers: StatsOffer[];
  offerTitles: Map<string, string>;
  windows: OpeningWindow[];
  timeOff: TimeOffRange[];
  timezone: string;
  range: StatsRange;
  now: Date;
}): Stats {
  const { bookings, offers, offerTitles, windows, timeOff, timezone, range, now } = input;

  const earliest = bookings.reduce<Date | null>((oldest, booking) => {
    const created = new Date(booking.created_at);
    return !oldest || created < oldest ? created : oldest;
  }, null);

  const from = rangeStart(range, now, earliest);
  const to = now;
  const granularity = granularityFor(from, to);
  const priced = new Map(offers.map((offer) => [offer.id, offer]));

  const buckets = emptyBuckets(from, to, granularity, timezone);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  // A booking belongs to the period it was received in: this is the demand
  // curve, not the agenda.
  const inRange = bookings.filter((booking) => {
    const created = new Date(booking.created_at);
    return created >= from && created <= to;
  });

  let revenue = 0;
  let collected = 0;
  let confirmed = 0;
  let cancelled = 0;
  let noShow = 0;
  const perOffer = new Map<string, number>();

  for (const booking of inRange) {
    const bucket = byKey.get(bucketKey(new Date(booking.created_at), granularity, timezone));
    const value = bookingValue(booking, priced);

    if (bucket) {
      bucket.bookings += 1;
      bucket.revenue += value;
    }

    revenue += value;
    if (booking.payment_status === "paid" && booking.payment_amount_cents) {
      collected += booking.payment_amount_cents / 100;
    }
    if (booking.status === "confirmed") confirmed += 1;
    if (booking.status === "cancelled") cancelled += 1;
    // A booking cancelled after being marked absent counts once, as a
    // cancellation: the slot did end up freed.
    if (booking.no_show && booking.status !== "cancelled") noShow += 1;

    const key = booking.offer_id ?? `title:${booking.offer_title}`;
    perOffer.set(key, (perOffer.get(key) ?? 0) + 1);
  }

  // Booked time is measured on the agenda, not on the order date: a session
  // booked last month but held this week fills this week.
  const heldUntil = new Date(Math.min(now.getTime(), to.getTime()));
  let bookedMinutes = 0;
  for (const booking of bookings) {
    if (booking.status === "cancelled" || !booking.starts_at || !booking.ends_at) continue;
    const start = new Date(booking.starts_at);
    if (start < from || start > heldUntil) continue;
    bookedMinutes += (new Date(booking.ends_at).getTime() - start.getTime()) / MINUTE;
  }

  const openMinutes = openMinutesBetween(windows, timeOff, from, heldUntil, timezone);

  const ranked = [...perOffer.entries()]
    .map(([key, count]) => ({
      id: key,
      label: offerTitles.get(key) ?? key.replace(/^title:/, ""),
      bookings: count,
      share: inRange.length > 0 ? count / inRange.length : 0,
    }))
    .sort((a, b) => b.bookings - a.bookings);

  const top = ranked.slice(0, MAX_OFFER_SLICES);
  const tail = ranked.slice(MAX_OFFER_SLICES);
  const offersShare: OfferShare[] =
    tail.length > 0
      ? [
          ...top,
          {
            id: "other",
            label: "",
            bookings: tail.reduce((total, item) => total + item.bookings, 0),
            share: tail.reduce((total, item) => total + item.share, 0),
          },
        ]
      : top;

  return {
    from,
    to,
    granularity,
    buckets,
    totals: {
      bookings: inRange.length,
      confirmed,
      cancelled,
      noShow,
      missed: cancelled + noShow,
      revenue,
      collected,
      fillRate: openMinutes > 0 ? Math.min(1, bookedMinutes / openMinutes) : null,
      cancellationRate: inRange.length > 0 ? cancelled / inRange.length : 0,
      missedRate: inRange.length > 0 ? (cancelled + noShow) / inRange.length : 0,
      bookedMinutes,
      openMinutes,
    },
    offers: offersShare,
  };
}
