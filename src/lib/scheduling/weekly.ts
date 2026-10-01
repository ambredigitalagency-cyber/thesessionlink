/**
 * The weekly opening hours, as the editors hold them: weekday → ranges.
 *
 * Shared by the onboarding screen and Dashboard › Availability, so both read,
 * check and write a week the same way. Weekdays follow getDay() (0 = Sunday);
 * times are "HH:MM" wall-clock in the pro's timezone, and "23:59" is the
 * slider's "until midnight".
 */

import { minutesOf } from "./time-off";

export type DayRange = { start: string; end: string };

export type WeekHours = Record<number, DayRange[]>;

export type WeeklyRule = { weekday: number; start_time: string; end_time: string };

export const DEFAULT_RANGE: DayRange = { start: "09:00", end: "17:00" };

/**
 * Monday to Friday, 9:00–17:00: what the database gives every new profile
 * (profiles_default_availability), so the screen shows what is already saved.
 */
export const DEFAULT_WEEK: WeekHours = Object.fromEntries(
  [1, 2, 3, 4, 5].map((weekday) => [weekday, [{ ...DEFAULT_RANGE }]]),
);

export function toWeekHours(rules: readonly WeeklyRule[]): WeekHours {
  const week: WeekHours = {};
  for (const rule of rules) {
    const list = week[rule.weekday] ?? [];
    list.push({ start: rule.start_time.slice(0, 5), end: rule.end_time.slice(0, 5) });
    week[rule.weekday] = list.sort((a, b) => a.start.localeCompare(b.start));
  }
  return week;
}

export function toWeeklyRules(week: WeekHours): WeeklyRule[] {
  return Object.entries(week).flatMap(([weekday, ranges]) =>
    (ranges ?? []).map((range) => ({
      weekday: Number(weekday),
      start_time: `${range.start}:00`,
      end_time: `${range.end}:00`,
    })),
  );
}

export function isOpen(week: WeekHours, weekday: number): boolean {
  return (week[weekday]?.length ?? 0) > 0;
}

export function minutesOpen(week: WeekHours): number {
  return Object.values(week)
    .flat()
    .reduce(
      (total, range) => total + Math.max(0, minutesOf(range.end) - minutesOf(range.start)),
      0,
    );
}

/** Two ranges on one day that share any minute. */
export function overlaps(ranges: readonly DayRange[]): boolean {
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.some((range, index) => index > 0 && range.start < sorted[index - 1].end);
}

/** What would be refused on save, or null when the week can be written. */
export function weekProblem(week: WeekHours): "end_before_start" | "overlap" | null {
  const ranges = Object.values(week).flat();
  if (ranges.some((range) => minutesOf(range.end) <= minutesOf(range.start))) {
    return "end_before_start";
  }
  if (Object.values(week).some((day) => overlaps(day ?? []))) return "overlap";
  return null;
}

/** A second range starts an hour after the last one ends, two hours long. */
export function nextRange(ranges: readonly DayRange[]): DayRange {
  const lastEnd = minutesOf(ranges.at(-1)?.end ?? "16:00");
  const start = Math.min(lastEnd + 60, 22 * 60);
  return { start: clock(start), end: clock(Math.min(start + 120, 24 * 60 - 15)) };
}

/**
 * A day being opened takes the hours of the first open day of the week, so
 * opening Saturday after shaping Monday does not throw the shape away.
 */
export function openingRanges(week: WeekHours, order: readonly number[]): DayRange[] {
  const model = order.map((weekday) => week[weekday]).find((ranges) => ranges?.length);
  return (model ?? [DEFAULT_RANGE]).map((range) => ({ ...range }));
}

/** Gives every other open day the hours of `from`. Closed days stay closed. */
export function copyToOpenDays(week: WeekHours, from: number): WeekHours {
  const source = week[from] ?? [];
  return Object.fromEntries(
    Object.entries(week).map(([weekday, ranges]) => [
      weekday,
      ranges?.length ? source.map((range) => ({ ...range })) : [],
    ]),
  );
}

export function sameWeek(a: WeekHours, b: WeekHours): boolean {
  const key = (week: WeekHours) =>
    toWeeklyRules(week)
      .map((rule) => `${rule.weekday}@${rule.start_time}-${rule.end_time}`)
      .sort()
      .join("|");
  return key(a) === key(b);
}

/**
 * "9–17", "9:30–17:45", "0–24": short enough for a day card a few dozen
 * pixels wide. 24-hour in both locales, like the slider's ticks.
 */
export function compactRange(range: DayRange): string {
  const short = (value: string) => {
    const minutes = minutesOf(value);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}:${String(rest).padStart(2, "0")}` : String(hours);
  };
  return `${short(range.start)}–${short(range.end)}`;
}

function clock(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
