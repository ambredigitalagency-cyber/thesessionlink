/**
 * The stops every numeric slider moves through, in one place.
 *
 * Each scale is dense where people actually pick and sparse where they rarely
 * go: a session is 15-minute steps up to four hours, then half-hours; a notice
 * is hour by hour for the first few, then days. Every stop stays inside what
 * the matching zod schema accepts (src/lib/offers/schema.ts, validation.ts).
 */

/** Evenly spaced stops, the building block of the scales below. */
export function steps(from: number, to: number, by: number): number[] {
  const list: number[] = [];
  for (let value = from; value <= to + 1e-9; value += by) list.push(Math.round(value * 100) / 100);
  return list;
}

/** calendar_booking.duration_minutes — 5 to 600. */
export const DURATION_STOPS = [...steps(15, 240, 15), ...steps(270, 480, 30), 540, 600];

/** calendar_booking.buffer_minutes — 0 to 240. */
export const BUFFER_STOPS = [...steps(0, 60, 5), ...steps(75, 120, 15), 180, 240];

/** calendar_booking.slot_interval_minutes — null means "same as the duration". */
export const INTERVAL_STOPS: (number | null)[] = [null, 5, 10, 15, 20, 30, 45, 60, 90, 120];

/** calendar_booking.min_notice_hours — 0 to 720. */
export const NOTICE_STOPS = [0, 1, 2, 3, 4, 6, 8, 12, 18, 24, 36, 48, 72, 96, 120, 168, 336, 720];

/** calendar_booking.max_days_ahead — 1 to 365. */
export const HORIZON_STOPS = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365];

/** direct_reservation.capacity — null (unlimited) sits at the far end. */
export const CAPACITY_STOPS: (number | null)[] = [
  ...steps(1, 30, 1),
  ...steps(35, 100, 5),
  150,
  200,
  300,
  500,
  null,
];

/** direct_reservation.max_quantity_per_booking — 1 to 50. */
/** action_config.capacity of a calendar offer: seats per slot, 1 = one-to-one. */
export const SEAT_STOPS = [...steps(1, 20, 1), 25, 30, 40, 50, 75, 100];

export const QUANTITY_STOPS = [...steps(1, 20, 1), 25, 30, 40, 50];

/** profiles.reminder_hours_before — 1 to 168. */
export const REMINDER_STOPS = [1, 2, 3, 4, 6, 8, 12, 18, 24, 36, 48, 72, 96, 120, 168];

/**
 * Offer prices. 1 € steps up to 100, 5 € to 500, 50 € to 2 000. Anything else
 * — cents, a 12 000 € package — goes through the exact input beside it.
 */
export const PRICE_STOPS = [...steps(0, 100, 1), ...steps(105, 500, 5), ...steps(550, 2000, 50)];

/** Duration details on offers (time field, "duration" mode) — up to a week. */
export const DETAIL_DURATION_STOPS = [
  ...steps(5, 60, 5),
  ...steps(75, 240, 15),
  ...steps(270, 480, 30),
  ...steps(540, 1440, 60),
  ...steps(2880, 10080, 1440),
];
