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
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { updateBookingStatus } from "@/actions/bookings";
import { Badge } from "@/components/ui/primitives";
import {
  DERIVED_STATUSES,
  DROPPABLE_STATUSES,
  derivedStatus,
  type DerivedStatus,
  type StoredStatus,
} from "@/lib/bookings/filters";
import { notify } from "@/lib/notify";
import { BOOKING_STATUS_TONE } from "@/lib/offers/meta";
import { cn } from "@/lib/utils";

import type { BookingRow } from "./bookings-view";

function isDroppable(status: DerivedStatus): status is StoredStatus {
  return (DROPPABLE_STATUSES as DerivedStatus[]).includes(status);
}

/**
 * Bookings as a board, one column per status.
 *
 * Dragging a card calls the same `updateBookingStatus` action the list view
 * uses, so confirmation e-mails and the no-overlap constraint behave
 * identically. The `completed` column is derived from the clock and therefore
 * refuses drops: moving a card into it would mean changing a date, which is the
 * calendar's job.
 */
export function BookingsKanban({
  bookings,
  timezone,
  locale,
  now,
  onOpen,
}: {
  bookings: BookingRow[];
  timezone: string;
  locale: string;
  now: number;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("dashboard.bookings");
  const tError = useTranslations("errors");
  const [dragging, setDragging] = useState<BookingRow | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // A small distance keeps a plain click on the card opening its sheet.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = DERIVED_STATUSES.map((status) => ({
    status,
    items: bookings.filter((booking) => derivedStatus(booking, now) === status),
  }));

  function handleDragStart(event: DragStartEvent) {
    setDragging(bookings.find((booking) => booking.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const booking = dragging;
    setDragging(null);

    const target = event.over?.id as DerivedStatus | undefined;
    if (!booking || !target) return;
    if (!isDroppable(target)) return;
    if (booking.status === target) return;

    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, target);
      if (result.ok) {
        notify.success(t(`statusChanged.${target}` as "statusChanged.confirmed"));
      } else {
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
      <div className="grid gap-3 lg:grid-cols-4">
        {columns.map((column) => (
          <Column
            key={column.status}
            status={column.status}
            count={column.items.length}
            label={t(`status.${column.status}` as "status.pending")}
          >
            {column.items.map((booking) => (
              <Card
                key={booking.id}
                booking={booking}
                timezone={timezone}
                locale={locale}
                onOpen={() => onOpen(booking.id)}
              />
            ))}
          </Column>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="surface-card w-64 p-3 shadow-[var(--shadow-float)]">
            <p className="text-ink truncate text-[13.5px] font-medium">{dragging.client_name}</p>
            <p className="text-ink-muted truncate text-[12.5px]">{dragging.offer_title}</p>
          </div>
        ) : null}
      </DragOverlay>

      <p className="text-ink-subtle mt-4 text-center text-[12.5px]">{t("kanbanHint")}</p>
    </DndContext>
  );
}

function Column({
  status,
  label,
  count,
  children,
}: {
  status: DerivedStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const droppable = isDroppable(status);
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !droppable });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-canvas border-line rounded-[var(--radius-md)] border p-2.5 transition-colors duration-150",
        isOver && droppable && "border-ink/30 bg-ink/[0.03]",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Badge tone={BOOKING_STATUS_TONE[status === "completed" ? "confirmed" : status]}>
            {label}
          </Badge>
          {!droppable ? <Lock className="text-ink-subtle size-3" /> : null}
        </div>
        <span className="text-ink-subtle text-[12px] tabular-nums">{count}</span>
      </header>

      <div className="min-h-24 space-y-2">{children}</div>
    </section>
  );
}

function Card({
  booking,
  timezone,
  locale,
  onOpen,
}: {
  booking: BookingRow;
  timezone: string;
  locale: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
  });

  const when = booking.starts_at
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(booking.starts_at))
    : (booking.requested_date ?? null);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "border-line bg-surface rounded-[var(--radius-sm)] border p-2.5 shadow-[var(--shadow-card)]",
        "transition-shadow duration-150 hover:shadow-[var(--shadow-float)]",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <p className="text-ink truncate text-[13.5px] font-medium">{booking.client_name}</p>
        <p className="text-ink-muted mt-0.5 truncate text-[12.5px]">{booking.offer_title}</p>
        {when ? <p className="text-ink-subtle mt-1.5 text-[12px]">{when}</p> : null}
      </button>
    </article>
  );
}
