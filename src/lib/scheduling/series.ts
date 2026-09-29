import { TZDate } from "@date-fns/tz";
import { addDays, addMonths } from "date-fns";

/**
 * The dates of a recurring booking.
 *
 * Built on the coach's wall clock, like the slot engine: "every Tuesday at
 * 18:00" stays at 18:00 across a daylight-saving change instead of drifting
 * an hour. Monthly means the same day of the month; a month without that day
 * (the 31st in April) lands on its last day, and the slot engine then says
 * whether that day is actually open.
 */

export const RECURRENCE_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/** Two to twelve sessions: enough for a term, not enough to fill a year blindly. */
export const SERIES_LIMITS = { min: 2, max: 12 } as const;

export function occurrences(
  first: Date,
  timezone: string,
  frequency: RecurrenceFrequency,
  count: number,
): Date[] {
  const start = new TZDate(first.getTime(), timezone);
  const total = Math.min(Math.max(1, Math.floor(count)), SERIES_LIMITS.max);

  return Array.from({ length: total }, (_, index) => {
    const next =
      frequency === "monthly"
        ? addMonths(start, index)
        : addDays(start, index * (frequency === "weekly" ? 7 : 14));
    return new Date(next.getTime());
  });
}
