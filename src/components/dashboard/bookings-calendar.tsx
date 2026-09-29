"use client";

import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ACTION_ICONS, BOOKING_STATUS_TONE, weekdayLabel } from "@/lib/offers/meta";
import type { ActionType } from "@/lib/offers/schema";
import { localDateKey } from "@/lib/scheduling/slots";
import { isTimed } from "@/lib/scheduling/time-off";

import { BookingsWeek } from "./bookings-week";
import { DayBlockPanel, RangeConfirm, type CalendarTimeOff } from "./calendar-blocking";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  offer_title: string;
  client_name: string;
  starts_at: string | null;
  ends_at: string | null;
  requested_date: string | null;
  status: "pending" | "confirmed" | "cancelled";
  action_type: ActionType;
};

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Every day of a range, as keys, both ends included. */
function daysOf(from: string, to: string): string[] {
  const days: string[] = [];
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let day = new Date(`${from}T00:00:00Z`).getTime(); day <= end; day += 86_400_000) {
    days.push(new Date(day).toISOString().slice(0, 10));
  }
  return days;
}

const ordered = (a: string, b: string): [string, string] => (a <= b ? [a, b] : [b, a]);

export function BookingsCalendar({
  bookings,
  timeOff,
  timezone,
  locale,
}: {
  bookings: CalendarBooking[];
  timeOff: CalendarTimeOff[];
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.bookings");
  const tBlock = useTranslations("dashboard.bookings.block");
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  const today = new Date();
  const todayKey = localDateKey(today, timezone);

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string>(todayKey);
  const [mode, setMode] = useState<"month" | "week">("month");

  /*
   * Blocking several days: press on a day and drag to another (mouse, pen),
   * or — where dragging would scroll the page — "Several days…" then a tap on
   * the last day. Either way the range lands in `range` and waits for a
   * confirmation, so a stray drag never blocks anything on its own.
   */
  const [drag, setDrag] = useState<{ from: string; to: string } | null>(null);
  const [pickFrom, setPickFrom] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (!drag) return;
    // Re-subscribed on every move, so `drag` here is always the latest range.
    const current = drag;
    function release() {
      setDrag(null);
      if (current.from === current.to) return;
      const [from, to] = ordered(current.from, current.to);
      // Only what is still ahead can be blocked.
      if (to >= todayKey) setRange({ from: from < todayKey ? todayKey : from, to });
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [drag, todayKey]);

  /** Monday of the week holding the selected day, as a local date key. */
  const weekStart = useMemo(() => {
    const [year, month, day] = selected.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    // getUTCDay(): 0 = Sunday, so Monday-first needs the 6-day wrap.
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  }, [selected]);

  const weekLabel = useMemo(() => {
    const [year, month, day] = weekStart.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day));
    const end = new Date(Date.UTC(year, month - 1, day + 6));
    const fmt = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  }, [weekStart, tag]);

  function shiftWeek(direction: number) {
    const [year, month, day] = weekStart.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + direction * 7));
    setSelected(date.toISOString().slice(0, 10));
  }

  /** Bookings grouped by local day, in the pro's timezone. */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();

    for (const booking of bookings) {
      const key = booking.starts_at
        ? localDateKey(new Date(booking.starts_at), timezone)
        : booking.requested_date;
      if (!key) continue;

      const list = map.get(key) ?? [];
      list.push(booking);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
    }

    return map;
  }, [bookings, timezone]);

  /** Blocks by day: whole days in `offDays`, every block (timed or not) in `blocksByDay`. */
  const { offDays, partDays, blocksByDay } = useMemo(() => {
    const off = new Set<string>();
    const part = new Set<string>();
    const map = new Map<string, CalendarTimeOff[]>();
    for (const block of timeOff) {
      for (const key of daysOf(block.starts_on, block.ends_on)) {
        (isTimed(block) ? part : off).add(key);
        map.set(key, [...(map.get(key) ?? []), block]);
      }
    }
    return { offDays: off, partDays: part, blocksByDay: map };
  }, [timeOff]);

  /** The range being drawn, being picked, or waiting for confirmation. */
  const preview = useMemo(() => {
    const ends = drag
      ? [drag.from, drag.to]
      : pickFrom && hovered
        ? [pickFrom, hovered]
        : range
          ? [range.from, range.to]
          : null;
    if (!ends) return null;
    const [from, to] = ordered(ends[0], ends[1]);
    return { from, to };
  }, [drag, pickFrom, hovered, range]);

  const firstOfMonth = new Date(Date.UTC(cursor.year, cursor.month, 1));
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  // Monday-first grid.
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;

  const monthLabel = new Intl.DateTimeFormat(tag, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(firstOfMonth);

  const selectedBookings = byDay.get(selected) ?? [];

  function shift(delta: number) {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  function pickDay(key: string) {
    if (pickFrom) {
      const [from, to] = ordered(pickFrom, key);
      setPickFrom(null);
      setHovered(null);
      if (to >= todayKey) setRange({ from: from < todayKey ? todayKey : from, to });
    }
    setSelected(key);
  }

  return (
    <div className="space-y-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-ink text-[16px] font-semibold tracking-[-0.02em] capitalize">
          {mode === "week" ? weekLabel : monthLabel}
        </p>

        <div className="flex items-center gap-2">
          <div className="border-line bg-surface flex items-center gap-0.5 rounded-full border p-0.5">
            {(["month", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                aria-label={t(`calendarMode.${option}` as "calendarMode.month")}
                onClick={() => setMode(option)}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  mode === option
                    ? "bg-ink text-ink-inverse"
                    : "text-ink-muted hover:text-ink hover:bg-ink/5",
                )}
              >
                {option === "month" ? (
                  <LayoutGrid className="size-4" />
                ) : (
                  <CalendarDays className="size-4" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => (mode === "week" ? shiftWeek(-1) : shift(-1))}
              aria-label={mode === "week" ? t("previousWeek") : t("previousMonth")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCursor({ year: today.getFullYear(), month: today.getMonth() });
                setSelected(todayKey);
              }}
            >
              {t("todayButton")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => (mode === "week" ? shiftWeek(1) : shift(1))}
              aria-label={mode === "week" ? t("nextWeek") : t("nextMonth")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {mode === "week" ? (
        <BookingsWeek
          bookings={bookings}
          timeOff={timeOff}
          weekStart={weekStart}
          selected={selected}
          onSelectDay={setSelected}
          timezone={timezone}
          locale={locale}
          onOpen={(id) => {
            // Neither view has a detail panel: selecting the day surfaces the
            // booking in the list underneath.
            const target = bookings.find((booking) => booking.id === id);
            const key = target?.starts_at
              ? localDateKey(new Date(target.starts_at), timezone)
              : target?.requested_date;
            if (key) setSelected(key);
          }}
        />
      ) : (
        <div className="surface-card p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-1 select-none">
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => (
              <div
                key={weekday}
                className="text-ink-subtle pb-1.5 text-center text-[11px] font-medium tracking-wide uppercase"
              >
                {weekdayLabel(weekday, locale, "short").slice(0, 2)}
              </div>
            ))}

            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <div key={`blank-${index}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const key = dateKey(cursor.year, cursor.month, day);
              const dayBookings = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const isOff = offDays.has(key);
              const isPart = !isOff && partDays.has(key);
              const inPreview =
                preview !== null && key >= preview.from && key <= preview.to && key >= todayKey;
              const hasPending = dayBookings.some((booking) => booking.status === "pending");

              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  onClick={() => pickDay(key)}
                  onPointerDown={(event) => {
                    // Touch scrolls the page; ranges there go through "Several days".
                    if (event.pointerType === "touch" || event.button !== 0) return;
                    setRange(null);
                    setDrag({ from: key, to: key });
                  }}
                  onPointerEnter={() => {
                    if (drag) setDrag({ ...drag, to: key });
                    if (pickFrom) setHovered(key);
                  }}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-xs)] text-[13px]",
                    "transition-[background-color,color,box-shadow] duration-150",
                    inPreview
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] ring-1 ring-[var(--accent)]/40 ring-inset"
                      : isSelected
                        ? "bg-ink text-ink-inverse"
                        : isOff
                          ? "text-ink-subtle"
                          : "text-ink hover:bg-ink/5",
                  )}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={
                    isOff
                      ? `${day} — ${tBlock("dayBlocked")}`
                      : isPart
                        ? `${day} — ${tBlock("partBlocked")}`
                        : undefined
                  }
                >
                  {isOff && !isSelected && !inPreview ? (
                    <span aria-hidden className="blocked-hatch absolute inset-0" />
                  ) : null}

                  <span
                    className={cn(
                      "relative font-medium",
                      isToday && !isSelected && !inPreview && "text-[var(--accent)]",
                    )}
                  >
                    {day}
                  </span>

                  {dayBookings.length > 0 ? (
                    <span className="relative flex items-center gap-0.5">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <span
                          key={booking.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            isSelected
                              ? "bg-ink-inverse/70"
                              : booking.status === "pending"
                                ? "bg-[var(--accent)]"
                                : "bg-ink/40",
                          )}
                        />
                      ))}
                    </span>
                  ) : isOff ? (
                    <Plane className="relative size-3 opacity-50" />
                  ) : null}

                  {/* Some hours of the day are blocked: a hatched rule along the bottom. */}
                  {isPart ? (
                    <span
                      aria-hidden
                      className={cn(
                        "blocked-hatch absolute inset-x-2 bottom-1 h-1 rounded-full",
                        isSelected && "opacity-60 invert",
                      )}
                    />
                  ) : null}

                  {hasPending && !isSelected ? (
                    <span className="absolute inset-0 rounded-[var(--radius-xs)] ring-1 ring-[var(--accent)]/30 ring-inset" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="text-ink-subtle mt-3 text-center text-[12.5px] max-sm:hidden">
            {tBlock("dragHint")}
          </p>
        </div>
      )}

      {range ? (
        <RangeConfirm
          key={`${range.from}|${range.to}`}
          from={range.from}
          to={range.to}
          locale={locale}
          onDone={() => setRange(null)}
        />
      ) : null}

      <div>
        <p className="text-ink-subtle mb-3 text-[13px] font-medium tracking-wide uppercase">
          {new Intl.DateTimeFormat(tag, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(new Date(`${selected}T12:00:00Z`))}
        </p>

        <div className="mb-4">
          <DayBlockPanel
            key={selected}
            day={selected}
            isPast={selected < todayKey}
            blocks={blocksByDay.get(selected) ?? []}
            locale={locale}
            picking={pickFrom !== null}
            onPickRange={() => {
              if (pickFrom) {
                setPickFrom(null);
                setHovered(null);
              } else {
                setRange(null);
                setMode("month");
                setPickFrom(selected);
              }
            }}
          />
        </div>

        {selectedBookings.length === 0 ? (
          <p className="border-line-strong text-ink-muted rounded-[var(--radius-md)] border border-dashed px-4 py-8 text-center text-[13.5px]">
            {offDays.has(selected) ? t("dayOff") : t("noBookingsThatDay")}
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedBookings.map((booking) => {
              const Icon = ACTION_ICONS[booking.action_type];
              const time = booking.starts_at
                ? new Intl.DateTimeFormat(tag, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone,
                  }).format(new Date(booking.starts_at))
                : null;

              return (
                <li
                  key={booking.id}
                  data-action={booking.action_type}
                  className="border-line bg-surface flex items-center gap-3 rounded-[var(--radius-md)] border border-l-[3px] border-l-[var(--event)] p-3"
                >
                  <span className="text-ink w-12 shrink-0 text-[13px] font-semibold">
                    {time ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate text-[14.5px] font-medium">
                      {booking.client_name}
                    </p>
                    <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]">
                      <Icon className="size-3 text-[var(--event)]" />
                      {booking.offer_title}
                    </p>
                  </div>
                  <Badge tone={BOOKING_STATUS_TONE[booking.status]}>
                    {t(`statusShort.${booking.status}` as "statusShort.pending")}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
