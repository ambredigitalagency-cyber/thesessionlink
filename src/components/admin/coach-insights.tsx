"use client";

import { Download, Pencil, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { adminUpdateBooking } from "@/actions/admin";
import { ColumnChart, ShareBar, type Point } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuTrigger, Modal } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/primitives";
import { notify } from "@/lib/notify";
import { BOOKING_STATUS_TONE } from "@/lib/offers/meta";
import { cn } from "@/lib/utils";

/**
 * The richer half of a coach's file in the console: activity over time, the
 * offers and bookings an admin can step into, and the data export.
 *
 * The charts are the coach dashboard's own (components/dashboard/charts),
 * fed by the same statistics engine, in the console's steel.
 */

/* -------------------------------------------------------------------------- */
/* Evolution                                                                   */
/* -------------------------------------------------------------------------- */

/** Steel, from the console accent out, for the per-offer breakdown. */
const STEEL = ["var(--console-accent)", "#6f8bb5", "#9db1cf", "#c5d2e5", "#4a6a99", "#8594aa"];

export function CoachEvolution({
  bookings,
  revenue,
  shares,
  currency,
  locale,
}: {
  bookings: Point[];
  revenue: Point[];
  shares: { id: string; label: string; value: number; share: number }[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("admin.evolution");
  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      value,
    );

  return (
    <div className="space-y-7">
      <div className="grid gap-7 lg:grid-cols-2">
        <div>
          <p className="text-ink-muted mb-2 text-[12.5px] font-medium">{t("bookings")}</p>
          <ColumnChart
            points={bookings}
            format={(value) => String(value)}
            title={t("bookings")}
            color="var(--console-accent)"
            emptyLabel={t("empty")}
          />
        </div>
        <div>
          <p className="text-ink-muted mb-2 text-[12.5px] font-medium">{t("revenue")}</p>
          <ColumnChart
            points={revenue}
            format={money}
            title={t("revenue")}
            color="var(--console-accent)"
            emptyLabel={t("empty")}
          />
        </div>
      </div>
      {shares.length > 0 ? (
        <div>
          <p className="text-ink-muted mb-2 text-[12.5px] font-medium">{t("byOffer")}</p>
          <ShareBar
            slices={shares.map((slice, index) => ({
              ...slice,
              color: STEEL[index % STEEL.length],
            }))}
            countLabel={(value) => String(value)}
          />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

export type AdminOfferRow = {
  id: string;
  title: string;
  actionLabel: string;
  priceLabel: string;
  isActive: boolean;
};

export function CoachOffersPanel({
  coachId,
  offers,
}: {
  coachId: string;
  offers: AdminOfferRow[];
}) {
  const t = useTranslations("admin.intervention");

  if (offers.length === 0) return <p className="text-ink-subtle text-[13px]">{t("noOffers")}</p>;

  return (
    <ul className="divide-line -my-2 divide-y">
      {offers.map((offer) => (
        <li key={offer.id} className="group flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[14px] font-medium",
                offer.isActive ? "text-ink" : "text-ink-subtle",
              )}
            >
              {offer.title}
            </p>
            <p className="text-ink-subtle mt-0.5 text-[12.5px]">
              {offer.actionLabel} · {offer.priceLabel}
              {offer.isActive ? null : ` · ${t("hidden")}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={`/admin/coaches/${coachId}/offers/${offer.id}`}>
              <Pencil className="size-3.5" aria-hidden />
              {t("editOffer")}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

export type AdminBookingRow = {
  id: string;
  offerTitle: string;
  clientName: string;
  when: string;
  status: "pending" | "confirmed" | "cancelled";
  noShow: boolean;
  /** Confirmed and already started: the only case a no-show can be marked. */
  canMarkNoShow: boolean;
};

type Change = "confirm" | "cancel" | "mark_no_show" | "clear_no_show";

export function CoachBookingsPanel({ bookings }: { bookings: AdminBookingRow[] }) {
  const t = useTranslations("admin.intervention");
  const tStatus = useTranslations("bookingStatus");
  const tError = useTranslations("errors");
  const router = useRouter();
  const [target, setTarget] = useState<{ booking: AdminBookingRow; change: Change } | null>(null);
  const [note, setNote] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [pending, startTransition] = useTransition();

  function open(booking: AdminBookingRow, change: Change) {
    setTarget({ booking, change });
    setNote("");
    setNotifyClient(true);
  }

  function apply() {
    if (!target) return;
    startTransition(async () => {
      const result = await adminUpdateBooking({
        bookingId: target.booking.id,
        change: target.change,
        note: note.trim() || undefined,
        notifyClient,
      });
      if (result.ok) {
        notify.success(t("done"));
        setTarget(null);
        router.refresh();
      } else {
        notify.error(tError((result.error ?? "unexpected") as "unexpected"));
      }
    });
  }

  if (bookings.length === 0)
    return <p className="text-ink-subtle text-[13px]">{t("noBookings")}</p>;

  const emails = target && (target.change === "confirm" || target.change === "cancel");

  return (
    <>
      <ul className="divide-line -my-2 divide-y">
        {bookings.map((booking) => (
          <li key={booking.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate text-[14px] font-medium">{booking.clientName}</p>
              <p className="text-ink-subtle mt-0.5 truncate text-[12.5px]">
                {booking.offerTitle} · {booking.when}
              </p>
            </div>
            <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Badge>
            {booking.noShow ? <Badge tone="warning">{t("noShow")}</Badge> : null}
            <Menu>
              <MenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("actionsFor", { client: booking.clientName })}
                >
                  {t("intervene")}
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                {booking.status !== "confirmed" ? (
                  <MenuItem onSelect={() => open(booking, "confirm")}>
                    {t("changes.confirm")}
                  </MenuItem>
                ) : null}
                {booking.status !== "cancelled" ? (
                  <MenuItem onSelect={() => open(booking, "cancel")}>
                    {t("changes.cancel")}
                  </MenuItem>
                ) : null}
                {booking.canMarkNoShow ? (
                  <MenuItem
                    onSelect={() =>
                      open(booking, booking.noShow ? "clear_no_show" : "mark_no_show")
                    }
                  >
                    {booking.noShow ? t("changes.clear_no_show") : t("changes.mark_no_show")}
                  </MenuItem>
                ) : null}
              </MenuContent>
            </Menu>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(target)}
        onOpenChange={(value) => !value && setTarget(null)}
        title={target ? t(`changes.${target.change}`) : ""}
        description={
          target
            ? `${target.booking.clientName} · ${target.booking.offerTitle} · ${target.booking.when}`
            : ""
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTarget(null)}>
              {t("cancelAction")}
            </Button>
            <Button onClick={apply} loading={pending}>
              {t("apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] p-3 text-[13px] leading-relaxed text-[var(--color-warning)]">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("bookingWarning")}
          </p>
          <Textarea
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            aria-label={t("notePlaceholder")}
          />
          {emails ? (
            <label className="text-ink flex items-center gap-2.5 text-[13.5px]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--console-accent)]"
                checked={notifyClient}
                onChange={(event) => setNotifyClient(event.target.checked)}
              />
              {t("notifyClient")}
            </label>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

export function ExportMenu({ coachId }: { coachId: string }) {
  const t = useTranslations("admin.export");
  const base = `/admin/coaches/${coachId}/export`;
  const items = [
    { href: `${base}?format=json`, label: t("json") },
    { href: `${base}?format=csv&kind=offers`, label: t("csvOffers") },
    { href: `${base}?format=csv&kind=clients`, label: t("csvClients") },
    { href: `${base}?format=csv&kind=bookings`, label: t("csvBookings") },
  ];

  return (
    <Menu>
      <MenuTrigger className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors">
        <Download className="size-3.5" aria-hidden />
        {t("title")}
      </MenuTrigger>
      <MenuContent align="end">
        {items.map((item) => (
          <MenuItem key={item.href} asChild>
            <a href={item.href} download>
              {item.label}
            </a>
          </MenuItem>
        ))}
        <p className="text-ink-subtle max-w-60 px-3 pt-1 pb-2 text-[11.5px] leading-snug">
          {t("note")}
        </p>
      </MenuContent>
    </Menu>
  );
}
