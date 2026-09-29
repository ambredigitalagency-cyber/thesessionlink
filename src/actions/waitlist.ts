"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { sendBookingConfirmationToClient, sendBookingNotificationToPro } from "@/lib/emails/send";
import { onlinePaymentFor, parseActionConfig } from "@/lib/offers/schema";
import { getBookingContext, slotInputFrom } from "@/lib/public/booking-context";
import { generateSlotGrid, isSlotBookable } from "@/lib/scheduling/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { fieldErrorsFrom, localeSchema, type ActionResult } from "@/lib/validation";

/**
 * The public side of the waitlist: joining the queue for a taken slot, and
 * taking the place when it is offered. Both run with the service key, like a
 * public booking, and check the slot themselves rather than trust the page.
 */

const joinSchema = z.object({
  offer_id: z.uuid(),
  start: z.iso.datetime({ offset: true }),
  seats: z.number().int().min(1).max(100).default(1),
  client_name: z.string().trim().min(2, "too_short").max(120),
  client_email: z
    .email("invalid_email")
    .max(160)
    .transform((value) => value.toLowerCase()),
  client_timezone: z.string().max(60).nullish(),
  locale: localeSchema.default("en"),
  /** Honeypot, as on the booking form. */
  company: z.string().max(200).optional(),
});

async function allowed(bucket: string, limit: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window: "01:00:00",
  });
  return error ? true : data !== false;
}

export async function joinWaitlist(input: unknown): Promise<ActionResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const values = parsed.data;
  if (values.company) return { ok: false, error: "invalid_input" };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const [byEmail, byIp] = await Promise.all([
    allowed(`waitlist:${values.offer_id}:${values.client_email}`, 5),
    allowed(`waitlist_ip:${ip}`, 20),
  ]);
  if (!byEmail || !byIp) return { ok: false, error: "too_many_requests" };

  // Only a slot that bookings hold can be waited for — the same flag the
  // picker showed, computed again here.
  const start = new Date(values.start);
  const window = {
    from: new Date(start.getTime() - 60_000),
    to: new Date(start.getTime() + 60_000),
  };
  const context = await getBookingContext(values.offer_id, window);
  if (!context || context.offer.action_type !== "calendar_booking") {
    return { ok: false, error: "offer_unavailable" };
  }
  const slot = generateSlotGrid(slotInputFrom(context, window)).find(
    (item) => item.start.getTime() === start.getTime(),
  );
  if (!slot) return { ok: false, error: "slot_unavailable" };
  if (slot.status === "available") return { ok: false, error: "slot_is_free" };
  if (!slot.waitlist) return { ok: false, error: "slot_unavailable" };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    profile_id: context.profile.id,
    offer_id: context.offer.id,
    slot_start: start.toISOString(),
    seats:
      parseActionConfig("calendar_booking", context.offer.action_config).capacity > 1
        ? values.seats
        : 1,
    client_name: values.client_name,
    client_email: values.client_email,
    client_timezone: values.client_timezone ?? null,
    locale: values.locale,
  });

  // Already in the queue for this slot: that is the outcome they wanted.
  if (error && error.code !== "23505") {
    console.error("[waitlist] join failed", error);
    return { ok: false, error: "unexpected" };
  }
  return { ok: true };
}

/** Everything the confirmation page needs, or why there is nothing to take. */
export async function readWaitlistOffer(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createSupabaseAdminClient();
  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("*, offers(title, action_config), profiles(display_name, slug, timezone)")
    .eq("token", token)
    .maybeSingle();
  if (!entry) return null;

  const live =
    entry.status === "notified" &&
    entry.expires_at !== null &&
    new Date(entry.expires_at).getTime() > Date.now();

  return {
    status: live
      ? ("open" as const)
      : entry.status === "claimed"
        ? ("claimed" as const)
        : ("gone" as const),
    slotStart: entry.slot_start,
    expiresAt: entry.expires_at,
    seats: entry.seats,
    offerTitle: (entry.offers as { title: string } | null)?.title ?? "",
    pro: entry.profiles as { display_name: string; slug: string; timezone: string } | null,
    locale: entry.locale,
  };
}

async function proEmail(profile: Tables<"profiles">) {
  if (profile.contact_email) return profile.contact_email;
  const { data } = await createSupabaseAdminClient().auth.admin.getUserById(profile.user_id);
  return data.user?.email ?? null;
}

/**
 * Takes the offered place: the slot is checked once more, then booked like a
 * public booking would be. An offer that needs paying online sends the client
 * to the page instead — a checkout is not something to run from an email link.
 */
export async function claimWaitlistPlace(
  token: string,
): Promise<ActionResult<{ manageToken: string; status: string }>> {
  const supabase = createSupabaseAdminClient();
  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!entry || entry.status !== "notified" || !entry.expires_at) {
    return { ok: false, error: "waitlist_gone" };
  }
  if (new Date(entry.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "waitlist_expired" };
  }

  const start = new Date(entry.slot_start);
  const window = { from: new Date(), to: new Date(start.getTime() + 24 * 3600_000) };
  const context = await getBookingContext(entry.offer_id, window);
  if (!context) return { ok: false, error: "offer_unavailable" };

  const config = parseActionConfig("calendar_booking", context.offer.action_config);
  if (onlinePaymentFor("calendar_booking", config) === "required") {
    return { ok: false, error: "waitlist_pay_on_page" };
  }

  const slot = isSlotBookable(slotInputFrom(context, window), start);
  if (!slot || (slot.seatsLeft !== undefined && slot.seatsLeft < entry.seats)) {
    await supabase.from("waitlist_entries").update({ status: "expired" }).eq("id", entry.id);
    return { ok: false, error: "slot_unavailable" };
  }

  const { data: created, error } = await supabase
    .from("bookings")
    .insert({
      profile_id: context.profile.id,
      offer_id: context.offer.id,
      action_type: "calendar_booking",
      offer_title: context.offer.title,
      client_name: entry.client_name,
      client_email: entry.client_email,
      client_timezone: entry.client_timezone,
      locale: entry.locale,
      starts_at: slot.start.toISOString(),
      ends_at: slot.end.toISOString(),
      quantity: config.capacity > 1 ? entry.seats : 1,
      status: config.requires_confirmation ? "pending" : "confirmed",
    })
    .select("*")
    .single();

  if (error || !created) {
    if (error?.code === "23P01" || error?.message?.includes("capacity_exceeded")) {
      return { ok: false, error: "slot_unavailable" };
    }
    console.error("[waitlist] claim failed", error);
    return { ok: false, error: "unexpected" };
  }

  await supabase
    .from("waitlist_entries")
    .update({ status: "claimed", booking_id: created.id })
    .eq("id", entry.id);

  const profile = context.profile;
  after(async () => {
    await sendBookingConfirmationToClient({ booking: created, profile });
    if (profile.notify_new_bookings) {
      const to = await proEmail(profile);
      if (to) await sendBookingNotificationToPro({ booking: created, profile, to });
    }
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true, data: { manageToken: created.manage_token, status: created.status } };
}
