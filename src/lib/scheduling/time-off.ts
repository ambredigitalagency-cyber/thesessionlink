/**
 * Time off, read the same way everywhere: the slot engine, the stats, the
 * calendar.
 *
 * A range covers every day from starts_on to ends_on. Without hours it takes
 * the whole of each day; with hours (wall-clock, in the pro's timezone) it
 * takes only start_time..end_time on each of them.
 */

export type TimeOffRange = {
  starts_on: string; // "2026-08-01"
  ends_on: string;
  /** "14:00" or "14:00:00"; null for the whole day. */
  start_time?: string | null;
  end_time?: string | null;
};

/** Minutes after midnight. "23:59" — the slider's "until midnight" — counts as 24:00. */
export function minutesOf(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  const total = Number(hours) * 60 + Number(minutes);
  return total === 23 * 60 + 59 ? 24 * 60 : total;
}

export function isTimed(range: TimeOffRange): boolean {
  return Boolean(range.start_time && range.end_time);
}

function covers(range: TimeOffRange, dateKey: string): boolean {
  return dateKey >= range.starts_on && dateKey <= range.ends_on;
}

/** True when a whole-day range covers the day. */
export function isFullDayOff(dateKey: string, ranges: TimeOffRange[]): boolean {
  return ranges.some((range) => !isTimed(range) && covers(range, dateKey));
}

/** The hours blocked on a day by timed ranges, as [from, to) minutes, sorted and merged. */
export function blockedMinutes(dateKey: string, ranges: TimeOffRange[]): [number, number][] {
  const spans = ranges
    .filter((range) => isTimed(range) && covers(range, dateKey))
    .map((range) => [minutesOf(range.start_time!), minutesOf(range.end_time!)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [from, to] of spans) {
    const last = merged.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
}

/** Whether [from, to) minutes of a day touches a blocked span. */
export function overlapsBlocked(from: number, to: number, blocked: [number, number][]): boolean {
  return blocked.some(([start, end]) => from < end && to > start);
}

/** Minutes of [from, to) left once the blocked spans are taken out. */
export function minutesLeft(from: number, to: number, blocked: [number, number][]): number {
  let left = to - from;
  for (const [start, end] of blocked) {
    left -= Math.max(0, Math.min(to, end) - Math.max(from, start));
  }
  return Math.max(0, left);
}
