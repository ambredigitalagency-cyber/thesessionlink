import { TZDate } from "@date-fns/tz";

/**
 * Slot engine.
 *
 * Availability windows are wall-clock rules in the pro's timezone; bookings are
 * absolute instants. Slot starts are therefore built from local components
 * (via TZDate) so a 9:00 slot stays at 9:00 across DST transitions, while
 * overlap checks run on absolute timestamps.
 *
 * This is the single source of truth: the public page renders what it returns,
 * and the booking server action re-runs it before inserting.
 */

export type AvailabilityRule = {
  offer_id: string | null;
  weekday: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // "09:00:00"
  end_time: string; // "17:00:00", "24:00:00" allowed
};

export type TimeOffRange = {
  starts_on: string; // "2026-08-01"
  ends_on: string;
};

export type BusyRange = {
  start: Date;
  end: Date;
};

export type Slot = {
  start: Date;
  end: Date;
};

export type SlotEngineInput = {
  timezone: string;
  offerId: string;
  rules: AvailabilityRule[];
  timeOff?: TimeOffRange[];
  busy?: BusyRange[];
  durationMinutes: number;
  bufferMinutes?: number;
  slotIntervalMinutes?: number | null;
  minNoticeHours?: number;
  maxDaysAhead?: number;
  /** Window to compute (inclusive start, exclusive end). */
  from: Date;
  to: Date;
  now?: Date;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function parseTimeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Local calendar parts of an instant, in the given timezone. */
export function localParts(date: Date, timezone: string) {
  const zoned = new TZDate(date.getTime(), timezone);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
    weekday: zoned.getDay(),
  };
}

/** "2026-03-29" for an instant, in the given timezone. */
export function localDateKey(date: Date, timezone: string): string {
  const { year, month, day } = localParts(date, timezone);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function instantFromLocal(
  year: number,
  month: number,
  day: number,
  minutesOfDay: number,
  timezone: string,
): Date {
  const zoned = new TZDate(
    year,
    month,
    day,
    Math.floor(minutesOfDay / 60),
    minutesOfDay % 60,
    0,
    timezone,
  );
  return new Date(zoned.getTime());
}

/**
 * Offer-specific rules win over the profile-wide default schedule.
 * A pro who never touches per-offer availability just uses the default one.
 */
export function rulesForOffer(rules: AvailabilityRule[], offerId: string): AvailabilityRule[] {
  const specific = rules.filter((rule) => rule.offer_id === offerId);
  return specific.length > 0 ? specific : rules.filter((rule) => rule.offer_id === null);
}

function isDayOff(dateKey: string, timeOff: TimeOffRange[]): boolean {
  return timeOff.some((range) => dateKey >= range.starts_on && dateKey <= range.ends_on);
}

export function generateSlots(input: SlotEngineInput): Slot[] {
  const {
    timezone,
    offerId,
    durationMinutes,
    bufferMinutes = 0,
    slotIntervalMinutes,
    minNoticeHours = 0,
    maxDaysAhead = 60,
    timeOff = [],
    busy = [],
    from,
    to,
    now = new Date(),
  } = input;

  const rules = rulesForOffer(input.rules, offerId);
  if (rules.length === 0 || durationMinutes <= 0) return [];

  const step = Math.max(5, slotIntervalMinutes ?? durationMinutes);
  const earliest = new Date(Math.max(from.getTime(), now.getTime() + minNoticeHours * 60 * MINUTE));
  const latest = new Date(Math.min(to.getTime(), now.getTime() + maxDaysAhead * DAY));
  if (earliest >= latest) return [];

  const rulesByWeekday = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = rulesByWeekday.get(rule.weekday) ?? [];
    list.push(rule);
    rulesByWeekday.set(rule.weekday, list);
  }

  const slots: Slot[] = [];
  // Start one day early: a late-night window can still contain slots that fall
  // inside the requested range.
  let cursor = new Date(earliest.getTime() - DAY);
  const lastDay = new Date(latest.getTime() + DAY);

  while (cursor <= lastDay) {
    const { year, month, day, weekday } = localParts(cursor, timezone);
    const dateKey = localDateKey(cursor, timezone);
    const dayRules = rulesByWeekday.get(weekday) ?? [];

    if (dayRules.length > 0 && !isDayOff(dateKey, timeOff)) {
      for (const rule of dayRules) {
        const windowStart = parseTimeToMinutes(rule.start_time);
        const windowEnd = parseTimeToMinutes(rule.end_time);

        for (let offset = windowStart; offset + durationMinutes <= windowEnd; offset += step) {
          const start = instantFromLocal(year, month, day, offset, timezone);
          const end = instantFromLocal(year, month, day, offset + durationMinutes, timezone);

          if (start < earliest || start >= latest) continue;
          if (end <= start) continue;

          const blocked = busy.some(
            (range) =>
              start.getTime() < range.end.getTime() + bufferMinutes * MINUTE &&
              end.getTime() + bufferMinutes * MINUTE > range.start.getTime(),
          );
          if (blocked) continue;

          slots.push({ start, end });
        }
      }
    }

    cursor = new Date(cursor.getTime() + DAY);
  }

  const seen = new Set<number>();
  return slots
    .filter((slot) => {
      const key = slot.start.getTime();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Re-validates one slot before inserting a booking. */
export function isSlotBookable(input: SlotEngineInput, start: Date): Slot | null {
  const slots = generateSlots({
    ...input,
    from: new Date(start.getTime() - MINUTE),
    to: new Date(start.getTime() + MINUTE),
  });
  return slots.find((slot) => slot.start.getTime() === start.getTime()) ?? null;
}

/** Groups slots by calendar day in the viewer's timezone (for the UI). */
export function groupSlotsByDay(slots: Slot[], timezone: string): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = localDateKey(slot.start, timezone);
    const list = groups.get(key) ?? [];
    list.push(slot);
    groups.set(key, list);
  }
  return groups;
}
