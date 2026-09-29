import "server-only";

import { sendWaitlistOffer } from "@/lib/emails/send";
import { getBookingContext, slotInputFrom } from "@/lib/public/booking-context";
import { isSlotBookable } from "@/lib/scheduling/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The waitlist's one rule: when a place frees up, the first person waiting is
 * offered it — alone, for a while — and the next only if they let it go.
 *
 * Called after anything that can free a calendar slot (a cancellation by
 * either side, a move, a deletion) and by the reminders cron once an offer
 * runs out. Every step re-checks the slot with the engine, so a place that
 * someone else took meanwhile is never offered.
 */

/** How long a freed place is held for the person it is offered to. */
export const HOLD_MINUTES = 120;

type FreedSlot = { offer_id: string | null; starts_at: string | null; action_type: string };

export async function offerFreedSlot(slot: FreedSlot): Promise<void> {
  if (slot.action_type !== "calendar_booking" || !slot.offer_id || !slot.starts_at) return;
  const start = new Date(slot.starts_at);
  if (start.getTime() <= Date.now()) return;

  const supabase = createSupabaseAdminClient();

  // Someone is already holding this place: they keep it until it runs out.
  const { count: holding } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("offer_id", slot.offer_id)
    .eq("slot_start", start.toISOString())
    .eq("status", "notified");
  if (holding) return;

  const window = { from: new Date(), to: new Date(start.getTime() + 24 * 3600_000) };
  const context = await getBookingContext(slot.offer_id, window);
  if (!context) return;
  const free = isSlotBookable(slotInputFrom(context, window), start);
  if (!free) return;

  const { data: queue } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("offer_id", slot.offer_id)
    .eq("slot_start", start.toISOString())
    .eq("status", "waiting")
    .order("created_at")
    .limit(10);

  // First in line who fits: a family of three cannot take a single seat.
  const next = (queue ?? []).find((entry) => entry.seats <= (free.seatsLeft ?? 1));
  if (!next) return;

  // Held until the session starts at the latest.
  const expires = new Date(Math.min(Date.now() + HOLD_MINUTES * 60_000, start.getTime()));
  const { data: offered } = await supabase
    .from("waitlist_entries")
    .update({
      status: "notified",
      notified_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq("id", next.id)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();
  if (!offered) return;

  const result = await sendWaitlistOffer({
    entry: offered,
    offerTitle: context.offer.title,
    profile: context.profile,
    start,
    expires,
  });
  if (!result.ok) {
    // Undelivered is not offered: back in line, first again.
    await supabase
      .from("waitlist_entries")
      .update({ status: "waiting", notified_at: null, expires_at: null })
      .eq("id", offered.id);
  }
}

/** Offers that ran out pass to the next person. Run by the reminders cron. */
export async function expireWaitlistOffers(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data: expired } = await supabase
    .from("waitlist_entries")
    .update({ status: "expired" })
    .eq("status", "notified")
    .lt("expires_at", new Date().toISOString())
    .select("offer_id, slot_start");

  for (const entry of expired ?? []) {
    await offerFreedSlot({
      offer_id: entry.offer_id,
      starts_at: entry.slot_start,
      action_type: "calendar_booking",
    });
  }
  return expired?.length ?? 0;
}
