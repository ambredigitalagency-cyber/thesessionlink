import type { LucideIcon } from "lucide-react";
import { CalendarCheck, FileText, MessageCircle, MessageSquareText, Ticket } from "lucide-react";

import type { ActionType } from "./schema";

export const ACTION_ICONS: Record<ActionType, LucideIcon> = {
  calendar_booking: CalendarCheck,
  direct_reservation: Ticket,
  contact_request: MessageSquareText,
  whatsapp_direct: MessageCircle,
  quote_request: FileText,
};

/** Action types that produce a row in Bookings/CRM. */
export const ACTION_CREATES_BOOKING: Record<ActionType, boolean> = {
  calendar_booking: true,
  direct_reservation: true,
  contact_request: true,
  whatsapp_direct: false,
  quote_request: true,
};

export const BOOKING_STATUS_TONE = {
  pending: "warning",
  confirmed: "success",
  cancelled: "neutral",
} as const;

export function minutesToLabel(minutes: number, locale: string) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourUnit = locale === "fr" ? "h" : "h";
  const minuteUnit = locale === "fr" ? "min" : "min";

  if (hours === 0) return `${rest} ${minuteUnit}`;
  if (rest === 0) return `${hours} ${hourUnit}`;
  return `${hours} ${hourUnit} ${String(rest).padStart(2, "0")}`;
}

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function weekdayLabel(weekday: number, locale: string, width: "short" | "long" = "short") {
  // 2024-01-07 is a Sunday, so day + weekday lines up with getDay().
  const date = new Date(Date.UTC(2024, 0, 7 + weekday));
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: width,
    timeZone: "UTC",
  }).format(date);
}
