import "server-only";

import { parseActionConfig, type CalendarBookingConfig } from "@/lib/offers/schema";
import {
  generateSlotGrid,
  type AvailabilityRule,
  type BusyRange,
  type GradedSlot,
  type TimeOffRange,
} from "@/lib/scheduling/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export type BookingContext = {
  offer: Tables<"offers">;
  profile: Tables<"profiles">;
  rules: AvailabilityRule[];
  timeOff: TimeOffRange[];
  busy: BusyRange[];
};

const MAX_WINDOW_DAYS = 120;

/**
 * Everything the slot engine needs for one offer.
 * Uses the service key: availability and busy ranges must never be readable
 * from the browser (other people's bookings are private).
 */
export async function getBookingContext(
  offerId: string,
  window: { from: Date; to: Date },
): Promise<BookingContext | null> {
  const supabase = createSupabaseAdminClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .eq("is_active", true)
    .maybeSingle();

  if (!offer) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", offer.profile_id)
    .not("onboarding_completed_at", "is", null)
    .maybeSingle();

  if (!profile) return null;

  if (offer.action_type !== "calendar_booking") {
    return { offer, profile, rules: [], timeOff: [], busy: [] };
  }

  const [{ data: rules }, { data: timeOff }, { data: bookings }] = await Promise.all([
    supabase
      .from("availabilities")
      .select("offer_id, weekday, start_time, end_time")
      .eq("profile_id", profile.id),
    supabase
      .from("time_off")
      .select("starts_on, ends_on")
      .eq("profile_id", profile.id)
      .gte("ends_on", window.from.toISOString().slice(0, 10)),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("profile_id", profile.id)
      .neq("status", "cancelled")
      .not("starts_at", "is", null)
      .gte("starts_at", new Date(window.from.getTime() - 24 * 3600_000).toISOString())
      .lte("starts_at", new Date(window.to.getTime() + 24 * 3600_000).toISOString()),
  ]);

  return {
    offer,
    profile,
    rules: rules ?? [],
    timeOff: timeOff ?? [],
    busy: (bookings ?? [])
      .filter((booking) => booking.starts_at && booking.ends_at)
      .map((booking) => ({
        start: new Date(booking.starts_at as string),
        end: new Date(booking.ends_at as string),
      })),
  };
}

/** Builds the slot engine input from a booking context. */
export function slotInputFrom(context: BookingContext, window: { from: Date; to: Date }) {
  const config = parseActionConfig("calendar_booking", context.offer.action_config);

  return {
    timezone: context.profile.timezone,
    offerId: context.offer.id,
    rules: context.rules,
    timeOff: context.timeOff,
    busy: context.busy,
    durationMinutes: config.duration_minutes,
    bufferMinutes: config.buffer_minutes,
    slotIntervalMinutes: config.slot_interval_minutes,
    minNoticeHours: config.min_notice_hours,
    maxDaysAhead: config.max_days_ahead,
    from: window.from,
    to: window.to,
    now: new Date(),
  };
}

export function clampWindow(from: Date, to: Date) {
  const start = new Date(Math.max(from.getTime(), Date.now()));
  const maxEnd = new Date(start.getTime() + MAX_WINDOW_DAYS * 24 * 3600_000);
  return { from: start, to: new Date(Math.min(to.getTime(), maxEnd.getTime())) };
}

/**
 * Public slot list for an offer, in a bounded window. Unbookable slots are
 * returned too, marked as such, so the picker can grey them out; the booking
 * actions never trust this list and re-check the slot they are given.
 */
export async function getPublicSlots(
  offerId: string,
  from: Date,
  to: Date,
): Promise<{ slots: GradedSlot[]; config: CalendarBookingConfig; timezone: string } | null> {
  const window = clampWindow(from, to);
  const context = await getBookingContext(offerId, window);

  if (!context || context.offer.action_type !== "calendar_booking") return null;
  if (!context.profile.calendar_visible) {
    return {
      slots: [],
      config: parseActionConfig("calendar_booking", context.offer.action_config),
      timezone: context.profile.timezone,
    };
  }

  return {
    slots: generateSlotGrid(slotInputFrom(context, window)),
    config: parseActionConfig("calendar_booking", context.offer.action_config),
    timezone: context.profile.timezone,
  };
}
