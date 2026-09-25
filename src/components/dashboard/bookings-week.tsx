"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { rescheduleBooking } from "@/actions/bookings";
import { TZDate } from "@date-fns/tz";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

import type { CalendarBooking } from "./bookings-calendar";

const START_HOUR = 7;
const END_HOUR = 22;
const ROW_MINUTES = 30;
const ROW_HEIGHT = 28; // px per 30 minutes
const ROWS = ((END_HOUR - START_HOUR) * 60) / ROW_MINUTES;

/**
 * Wall-clock parts in the pro's timezone. `localParts` in the slot engine is
 * month-0-based and carries no time of day, which the grid needs.
 */
function zoned(date: Date, timezone: string) {
  const d = new TZDate(date.getTime(), timezone);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

/** Only timed sessions can live on a time grid. */
function isPlaceable(booking: CalendarBooking) {
  return Boolean(booking.starts_at && booking.ends_at);
}

function cellId(dayIso: string, minutes: number) {
  return `${dayIso}|${minutes}`;
}

/**
 * Week grid with a time axis.
 *
 * Dragging an event calls `rescheduleBooking`, which replays the same
 * validation a public booking goes through — availability, buffer, time off,
 * minimum notice — with the no-overlap constraint as the backstop. The move is
 * shown straight away and rolled back if the server refuses, so a rejected drop
 * visibly snaps home instead of failing quietly.
 */
export function BookingsWeek({
  bookings,
  weekStart,
  timezone,
  locale,
  onOpen,
}: {
  bookings: CalendarBooking[];
  /** Monday of the displayed week, as a local date key (YYYY-MM-DD). */
  weekStart: string;
  timezone: string;
  locale: string;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("dashboard.bookings");
  const tError = useTranslations("errors");
  const router = useRouter();

  const [dragging, setDragging] = useState<CalendarBooking | null>(null);
  /** Optimistic positions, keyed by booking id, dropped once the server answers. */
  const [moved, setMoved] = useState<Record<string, { starts_at: string; ends_at: string }>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const days = useMemo(() => {
    const [year, month, day] = weekStart.split("-").map(Number);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1, day + index));
      return {
        iso: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
          weekday: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(date),
      };
    });
  }, [weekStart, locale]);

  /** Events positioned on the grid, with any optimistic move applied. */
  const events = useMemo(() => {
    return bookings.filter(isPlaceable).map((booking) => {
      const override = moved[booking.id];
      const startsAt = override?.starts_at ?? (booking.starts_at as string);
      const endsAt = override?.ends_at ?? (booking.ends_at as string);

      const start = new Date(startsAt);
      const end = new Date(endsAt);
      const parts = zoned(start, timezone);
      const endParts = zoned(end, timezone);

      const startMinutes = parts.hour * 60 + parts.minute;
      const endMinutes = endParts.hour * 60 + endParts.minute;
      const duration = Math.max(ROW_MINUTES, endMinutes - startMinutes);

      return {
        booking,
        dayIso: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
        top: ((startMinutes - START_HOUR * 60) / ROW_MINUTES) * ROW_HEIGHT,
        height: (duration / ROW_MINUTES) * ROW_HEIGHT,
        startsAt,
      };
    });
  }, [bookings, moved, timezone]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(bookings.find((booking) => booking.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const booking = dragging;
    setDragging(null);
    if (!booking || !event.over) return;

    const [dayIso, minutesRaw] = String(event.over.id).split("|");
    const minutes = Number(minutesRaw);
    if (!dayIso || Number.isNaN(minutes)) return;

    // The grid is drawn in the pro's timezone, so the dropped wall-clock time is
    // sent as a local time and the server resolves it against the offer's slots.
    const [year, month, day] = dayIso.split("-").map(Number);
    const hours = Math.floor(minutes / 60);
    const target = new Date(
      Date.UTC(year, month - 1, day, hours, minutes % 60) -
        offsetMinutes(dayIso, timezone) * 60_000,
    );

    const previousStart = booking.starts_at as string;
    const previousEnd = booking.ends_at as string;
    const length = new Date(previousEnd).getTime() - new Date(previousStart).getTime();

    // Show the move immediately.
    setMoved((current) => ({
      ...current,
      [booking.id]: {
        starts_at: target.toISOString(),
        ends_at: new Date(target.getTime() + length).toISOString(),
      },
    }));
    setPendingId(booking.id);

    startTransition(async () => {
      const result = await rescheduleBooking(booking.id, target.toISOString());
      setPendingId(null);

      if (result.ok) {
        notify.success(t("rescheduled"));
        // Let the server be the source of truth again.
        setMoved((current) => {
          const next = { ...current };
          delete next[booking.id];
          return next;
        });
        router.refresh();
      } else {
        // Refused: drop the optimistic position so the event snaps back.
        setMoved((current) => {
          const next = { ...current };
          delete next[booking.id];
          return next;
        });
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="surface-card overflow-x-auto p-3 sm:p-4">
        <div className="grid min-w-[44rem] grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-px">
          <div />
          {days.map((day) => (
            <div
              key={day.iso}
              className="text-ink-muted pb-2 text-center text-[12.5px] font-medium capitalize"
            >
              {day.label}
            </div>
          ))}

          <div className="relative" style={{ height: ROWS * ROW_HEIGHT }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
              <span
                key={index}
                className="text-ink-subtle absolute -translate-y-1/2 pr-2 text-right text-[11px] tabular-nums"
                style={{ top: index * 2 * ROW_HEIGHT, right: 0 }}
              >
                {String(START_HOUR + index).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.iso}
              className="border-line relative border-l"
              style={{ height: ROWS * ROW_HEIGHT }}
            >
              {Array.from({ length: ROWS }, (_, row) => (
                <Cell
                  key={row}
                  dayIso={day.iso}
                  minutes={START_HOUR * 60 + row * ROW_MINUTES}
                  onHour={row % 2 === 0}
                />
              ))}

              {events
                .filter((item) => item.dayIso === day.iso)
                .map((item) => (
                  <Event
                    key={item.booking.id}
                    booking={item.booking}
                    top={item.top}
                    height={item.height}
                    pending={pendingId === item.booking.id}
                    onOpen={() => onOpen(item.booking.id)}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div
            data-action={dragging.action_type}
            className="pointer-events-none rounded-[var(--radius-xs)] bg-[var(--event-soft)] px-2 py-1 text-[11.5px] font-medium text-[var(--event-ink)] shadow-[var(--shadow-float)] ring-1 ring-[var(--event)]/40"
          >
            {dragging.client_name}
          </div>
        ) : null}
      </DragOverlay>

      <p className="text-ink-subtle mt-3 text-center text-[12.5px]">{t("weekHint")}</p>
    </DndContext>
  );
}

function Cell({ dayIso, minutes, onHour }: { dayIso: string; minutes: number; onHour: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(dayIso, minutes) });

  return (
    <div
      ref={setNodeRef}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "transition-colors duration-100",
        onHour ? "border-line/70 border-t" : "border-line/30 border-t border-dashed",
        isOver && "bg-ink/[0.06]",
      )}
    />
  );
}

function Event({
  booking,
  top,
  height,
  pending,
  onOpen,
}: {
  booking: CalendarBooking;
  top: number;
  height: number;
  pending: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-action={booking.action_type}
      style={{
        top,
        height,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "absolute inset-x-0.5 cursor-grab overflow-hidden rounded-[var(--radius-xs)]",
        "bg-[var(--event-soft)] px-1.5 py-1 text-left ring-1 ring-[var(--event)]/35",
        "transition-shadow duration-150 hover:shadow-[var(--shadow-card)] active:cursor-grabbing",
        isDragging && "opacity-30",
        pending && "animate-pulse",
        booking.status === "pending" && "border-l-2 border-dashed border-[var(--event)]",
      )}
      {...attributes}
      {...listeners}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span className="block truncate text-[11.5px] font-medium text-[var(--event-ink)]">
          {booking.client_name}
        </span>
        {height > ROW_HEIGHT * 1.5 ? (
          <span className="block truncate text-[11px] text-[var(--event-ink)]/70">
            {booking.offer_title}
          </span>
        ) : null}
      </button>
    </div>
  );
}

/**
 * Offset of the pro's timezone on a given local day, in minutes. Probed at noon
 * so a DST switch at midnight cannot land on the wrong side.
 */
function offsetMinutes(dayIso: string, timezone: string): number {
  const probe = new Date(`${dayIso}T12:00:00Z`);
  const parts = zoned(probe, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return (asUtc - probe.getTime()) / 60_000;
}
