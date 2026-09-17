"use client";

import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ACTION_ICONS, BOOKING_STATUS_TONE, weekdayLabel } from "@/lib/offers/meta";
import type { ActionType } from "@/lib/offers/schema";
import { localDateKey } from "@/lib/scheduling/slots";

import { BookingsWeek } from "./bookings-week";
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

type TimeOff = { id: string; starts_on: string; ends_on: string; label: string | null };

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BookingsCalendar({
  bookings,
  timeOff,
  timezone,
  locale,
}: {
  bookings: CalendarBooking[];
  timeOff: TimeOff[];
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.bookings");
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  const today = new Date();
  const todayKey = localDateKey(today, timezone);

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string>(todayKey);
  const [mode, setMode] = useState<"month" | "week">("month");

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

  const offDays = useMemo(() => {
    const set = new Set<string>();
    for (const range of timeOff) {
      const start = new Date(`${range.starts_on}T00:00:00Z`);
      const end = new Date(`${range.ends_on}T00:00:00Z`);
      for (let day = start; day <= end; day = new Date(day.getTime() + 86_400_000)) {
        set.add(day.toISOString().slice(0, 10));
      }
    }
    return set;
  }, [timeOff]);

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
          weekStart={weekStart}
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
          <div className="grid grid-cols-7 gap-1">
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
              const hasPending = dayBookings.some((booking) => booking.status === "pending");

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-xs)] text-[13px] transition-colors",
                    isSelected
                      ? "bg-ink text-ink-inverse"
                      : isOff
                        ? "bg-ink/[0.04] text-ink-subtle"
                        : "text-ink hover:bg-ink/5",
                  )}
                  aria-current={isToday ? "date" : undefined}
                >
                  <span
                    className={cn("font-medium", isToday && !isSelected && "text-[var(--accent)]")}
                  >
                    {day}
                  </span>

                  {dayBookings.length > 0 ? (
                    <span className="flex items-center gap-0.5">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <span
                          key={booking.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            isSelected
                              ? "bg-white/70"
                              : booking.status === "pending"
                                ? "bg-[var(--accent)]"
                                : "bg-ink/40",
                          )}
                        />
                      ))}
                    </span>
                  ) : isOff ? (
                    <Plane className="size-3 opacity-50" />
                  ) : null}

                  {hasPending && !isSelected ? (
                    <span className="absolute inset-0 rounded-[var(--radius-xs)] ring-1 ring-[var(--accent)]/30 ring-inset" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-ink-subtle mb-3 text-[13px] font-medium tracking-wide uppercase">
          {new Intl.DateTimeFormat(tag, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(new Date(`${selected}T12:00:00Z`))}
        </p>

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
