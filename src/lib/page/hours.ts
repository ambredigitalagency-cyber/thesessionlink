/**
 * Opening hours, for display only: "open now", and when it changes.
 *
 * Wall-clock times in the coach's timezone. A day whose closing time is not
 * after its opening time runs past midnight (a bar open 20:00–02:00), so the
 * first hours of the next day are checked against the day before.
 */

export type DayHours = { closed: boolean; open: string; close: string };
/** Indexed by weekday as Date#getDay() counts them: 0 = Sunday … 6 = Saturday. */
export type WeekHours = DayHours[];

export type OpenStatus =
  | { state: "open"; until: string }
  | { state: "closed"; next: { weekday: number; time: string } | null };

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Weekday and minutes since midnight of an instant, in a timezone. */
export function localClock(now: Date, timezone: string): { weekday: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return localClock(now, "UTC");
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function openStatus(week: WeekHours, timezone: string, now: Date): OpenStatus {
  const { weekday, minutes: current } = localClock(now, timezone);

  const today = week[weekday];
  if (today && !today.closed) {
    const open = minutes(today.open);
    const close = minutes(today.close);
    const overnight = close <= open;
    if (current >= open && (overnight || current < close))
      return { state: "open", until: today.close };
  }

  const yesterday = week[(weekday + 6) % 7];
  if (yesterday && !yesterday.closed) {
    const open = minutes(yesterday.open);
    const close = minutes(yesterday.close);
    if (close <= open && current < close) return { state: "open", until: yesterday.close };
  }

  // The next opening: later today, or on one of the next seven days.
  for (let offset = 0; offset < 8; offset++) {
    const day = week[(weekday + offset) % 7];
    if (!day || day.closed) continue;
    if (offset === 0 && minutes(day.open) <= current) continue;
    return { state: "closed", next: { weekday: (weekday + offset) % 7, time: day.open } };
  }
  return { state: "closed", next: null };
}

/** Monday first, as people in both locales read a week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function defaultWeek(): WeekHours {
  return Array.from({ length: 7 }, (_, weekday) => ({
    closed: weekday === 0,
    open: "09:00",
    close: weekday === 6 ? "13:00" : "18:00",
  }));
}
