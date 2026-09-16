"use client";

import {
  Ban,
  CalendarClock,
  Check,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteBooking, saveBookingNotes, updateBookingStatus } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import { Modal, Sheet } from "@/components/ui/overlays";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Field, Textarea } from "@/components/ui/field";
import { ACTION_ICONS, BOOKING_STATUS_TONE } from "@/lib/offers/meta";
import type { ActionType } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

export type BookingRow = {
  id: string;
  offer_title: string;
  action_type: ActionType;
  client_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_message: string | null;
  starts_at: string | null;
  ends_at: string | null;
  requested_date: string | null;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled";
  internal_notes: string | null;
  details: unknown;
  created_at: string;
};

type Filter = "upcoming" | "pending" | "all" | "past" | "cancelled";

const FILTERS: Filter[] = ["upcoming", "pending", "all", "past", "cancelled"];

export function BookingsView({
  bookings,
  timezone,
  locale,
  now,
}: {
  bookings: BookingRow[];
  timezone: string;
  locale: string;
  /** Rendering reference time, taken on the server so SSR and hydration agree. */
  now: number;
}) {
  const t = useTranslations("dashboard.bookings");
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        if (search) {
          const haystack = `${booking.client_name} ${booking.client_email} ${booking.offer_title}`;
          if (!haystack.toLowerCase().includes(search)) return false;
        }

        const reference = booking.starts_at ? new Date(booking.starts_at).getTime() : null;

        switch (filter) {
          case "pending":
            return booking.status === "pending";
          case "cancelled":
            return booking.status === "cancelled";
          case "upcoming":
            return (
              booking.status !== "cancelled" &&
              (reference === null ? booking.status === "pending" : reference >= now)
            );
          case "past":
            return reference !== null && reference < now;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const aTime = a.starts_at
          ? new Date(a.starts_at).getTime()
          : new Date(a.created_at).getTime();
        const bTime = b.starts_at
          ? new Date(b.starts_at).getTime()
          : new Date(b.created_at).getTime();
        return filter === "past" ? bTime - aTime : aTime - bTime;
      });
  }, [bookings, filter, query, now]);

  const counts = useMemo(
    () => ({
      pending: bookings.filter((booking) => booking.status === "pending").length,
      upcoming: bookings.filter(
        (booking) =>
          booking.status !== "cancelled" &&
          booking.starts_at &&
          new Date(booking.starts_at).getTime() >= now,
      ).length,
      clients: new Set(bookings.map((booking) => booking.client_email)).size,
    }),
    [bookings, now],
  );

  const open = bookings.find((booking) => booking.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label={t("stats.upcoming")} value={counts.upcoming} />
        <Stat label={t("stats.pending")} value={counts.pending} accent={counts.pending > 0} />
        <Stat label={t("stats.clients")} value={counts.clients} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex scrollbar-none gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                filter === item
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
              )}
            >
              {t(`filters.${item}` as "filters.all")}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="text-ink-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="border-line-strong bg-surface text-ink placeholder:text-ink-subtle focus:border-ink h-10 w-full rounded-full border pr-3 pl-9 text-[14px] focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title={t("empty.title")}
          description={t("empty.body")}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              timezone={timezone}
              locale={locale}
              onOpen={() => setOpenId(booking.id)}
            />
          ))}
        </ul>
      )}

      <BookingSheet
        booking={open}
        timezone={timezone}
        locale={locale}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-line bg-surface rounded-[var(--radius-md)] border px-4 py-3">
      <p
        className={cn(
          "text-[22px] font-semibold tracking-[-0.02em]",
          accent ? "text-[var(--accent)]" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="text-ink-muted mt-0.5 text-[12.5px]">{label}</p>
    </div>
  );
}

function formatWhen(booking: BookingRow, timezone: string, locale: string) {
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  if (booking.starts_at) {
    const start = new Date(booking.starts_at);
    const date = new Intl.DateTimeFormat(tag, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(start);
    const time = new Intl.DateTimeFormat(tag, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(start);
    return { date, time };
  }

  if (booking.requested_date) {
    const date = new Intl.DateTimeFormat(tag, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${booking.requested_date}T12:00:00Z`));
    return { date, time: null };
  }

  const created = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(booking.created_at));

  return { date: created, time: null };
}

function BookingListItem({
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
  const t = useTranslations("dashboard.bookings");
  const tStatus = useTranslations("bookingStatus");
  const Icon = ACTION_ICONS[booking.action_type];
  const when = formatWhen(booking, timezone, locale);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "border-line bg-surface hover:border-ink/20 flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
          booking.status === "cancelled" && "opacity-60",
        )}
      >
        <div className="bg-ink/[0.04] flex w-[4.5rem] shrink-0 flex-col items-center rounded-[var(--radius-xs)] px-2 py-2">
          <span className="text-ink text-[12px] font-medium capitalize">{when.date}</span>
          {when.time ? (
            <span className="text-ink text-[13px] font-semibold">{when.time}</span>
          ) : (
            <span className="text-ink-subtle text-[11px]">{t("noTime")}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-ink truncate text-[15px] font-medium">{booking.client_name}</p>
          <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 truncate text-[13px]">
            <Icon className="size-3.5 shrink-0" />
            {booking.offer_title}
            {booking.quantity > 1 ? <span>· ×{booking.quantity}</span> : null}
          </p>
        </div>

        <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Badge>
      </button>
    </li>
  );
}

function BookingSheet({
  booking,
  timezone,
  locale,
  onClose,
}: {
  booking: BookingRow | null;
  timezone: string;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.bookings");
  const tStatus = useTranslations("bookingStatus");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");

  const [notes, setNotes] = useState("");
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load the notes of whichever booking just opened.
  if (booking && notesFor !== booking.id) {
    setNotesFor(booking.id);
    setNotes(booking.internal_notes ?? "");
  }

  if (!booking) return null;

  const when = formatWhen(booking, timezone, locale);
  const budget = (booking.details as { budget?: string } | null)?.budget;

  function setStatus(status: "confirmed" | "cancelled") {
    startTransition(async () => {
      const result = await updateBookingStatus(booking!.id, status);
      if (result.ok) {
        toast.success(t(status === "confirmed" ? "confirmed" : "cancelledToast"));
        onClose();
      } else {
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <Sheet
      open={Boolean(booking)}
      onOpenChange={(open) => !open && onClose()}
      title={booking.client_name}
      description={booking.offer_title}
      footer={
        booking.status !== "cancelled" ? (
          <>
            {booking.status === "pending" ? (
              <Button onClick={() => setStatus("confirmed")} loading={pending}>
                <Check className="size-4" />
                {t("confirm")}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setStatus("cancelled")} loading={pending}>
              <Ban className="size-4" />
              {t("cancelBooking")}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            {tCommon("delete")}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Badge>
          <span className="text-ink-muted text-[13px]">
            {when.date}
            {when.time ? ` · ${when.time}` : ""}
          </span>
        </div>

        <dl className="space-y-3">
          <DetailRow icon={<Mail className="size-3.5" />} label={t("fields.email")}>
            <a href={`mailto:${booking.client_email}`} className="underline underline-offset-4">
              {booking.client_email}
            </a>
          </DetailRow>

          {booking.client_phone ? (
            <DetailRow icon={<Phone className="size-3.5" />} label={t("fields.phone")}>
              <a href={`tel:${booking.client_phone}`} className="underline underline-offset-4">
                {booking.client_phone}
              </a>
            </DetailRow>
          ) : null}

          {budget ? (
            <DetailRow icon={<MessageSquare className="size-3.5" />} label={t("fields.budget")}>
              {budget}
            </DetailRow>
          ) : null}

          {booking.client_id ? (
            <DetailRow icon={<UserRound className="size-3.5" />} label={t("fields.client")}>
              <Link
                href={`/dashboard/bookings/clients/${booking.client_id}`}
                className="underline underline-offset-4"
              >
                {t("openClient")}
              </Link>
            </DetailRow>
          ) : null}
        </dl>

        {booking.client_message ? (
          <div className="bg-ink/[0.03] rounded-[var(--radius-md)] p-4">
            <p className="text-ink-subtle text-[12px] font-medium tracking-wide uppercase">
              {t("fields.message")}
            </p>
            <p className="text-ink mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap">
              {booking.client_message}
            </p>
          </div>
        ) : null}

        <Field label={t("internalNotes")} hint={t("internalNotesHint")}>
          <Textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() =>
              startTransition(async () => {
                const result = await saveBookingNotes(booking.id, notes);
                if (!result.ok) toast.error(tError(result.error as "unexpected"));
              })
            }
            placeholder={t("internalNotesPlaceholder")}
          />
        </Field>
      </div>

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        size="sm"
        title={t("deleteTitle")}
        description={t("deleteBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteBooking(booking.id);
                  if (result.ok) {
                    setConfirmDelete(false);
                    onClose();
                  } else {
                    toast.error(tError(result.error as "unexpected"));
                  }
                })
              }
            >
              {tCommon("delete")}
            </Button>
          </>
        }
      />
    </Sheet>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-ink-subtle mt-0.5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-ink-subtle text-[12px] tracking-wide uppercase">{label}</dt>
        <dd className="text-ink mt-0.5 text-[14px] break-words">{children}</dd>
      </div>
    </div>
  );
}
