import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { subscriptionIsActive, type PaddleFacts } from "./paddle-core";

export type ApplyResult = {
  applied: boolean;
  reason?: "duplicate" | "stale" | "unknown_profile";
  profileId?: string;
};

/**
 * Applies one verified Paddle event to the coach's profile.
 *
 * Safe to receive twice and in any order, like settlePayment() for Stripe:
 *
 *   * an event id already in paddle_webhook_events is acknowledged and
 *     skipped — a retry or a replay never applies twice;
 *   * a subscription event older than the last one applied
 *     (subscription_synced_at) is recorded but changes nothing, so a delayed
 *     "active" can never undo a "canceled" that came after it;
 *   * the write itself is absolute ("status is X"), never relative, so even
 *     two deliveries racing past the first check leave the same row.
 *
 * The event is marked processed after the write, not before: a failure in
 * between leaves it unmarked, and Paddle's retry applies it then.
 */
export async function applyPaddleEvent(facts: PaddleFacts): Promise<ApplyResult> {
  const supabase = createSupabaseAdminClient();

  const { data: seen } = await supabase
    .from("paddle_webhook_events")
    .select("event_id")
    .eq("event_id", facts.eventId)
    .maybeSingle();
  if (seen) return { applied: false, reason: "duplicate" };

  const profile = await findProfile(facts);
  if (!profile) {
    await mark(facts, null, "unknown_profile");
    return { applied: false, reason: "unknown_profile" };
  }

  // What every supported event teaches: who the Paddle customer is, and which
  // subscription is theirs.
  const link: { paddle_customer_id?: string; paddle_subscription_id?: string } = {};
  if (facts.customerId && !profile.paddle_customer_id) link.paddle_customer_id = facts.customerId;
  if (facts.subscriptionId && profile.paddle_subscription_id !== facts.subscriptionId) {
    link.paddle_subscription_id = facts.subscriptionId;
  }

  if (facts.status) {
    const stale =
      profile.subscription_synced_at !== null &&
      new Date(profile.subscription_synced_at).getTime() > new Date(facts.occurredAt).getTime();
    if (stale) {
      await mark(facts, profile.id, "stale");
      return { applied: false, reason: "stale", profileId: profile.id };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        ...link,
        subscription_status: facts.status,
        subscription_active: subscriptionIsActive(facts.status),
        subscription_renews_at: facts.status === "canceled" ? null : facts.renewsAt,
        subscription_synced_at: facts.occurredAt,
      })
      .eq("id", profile.id);
    if (error) throw new Error(`profile update failed: ${error.code}`);
  } else if (Object.keys(link).length > 0) {
    // transaction.completed: the payment itself does not change the status —
    // the subscription events do — but it can be the first to name the ids.
    const { error } = await supabase.from("profiles").update(link).eq("id", profile.id);
    if (error) throw new Error(`profile link failed: ${error.code}`);
  }

  await mark(facts, profile.id, "applied");
  return { applied: true, profileId: profile.id };
}

type ProfileRow = {
  id: string;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  subscription_synced_at: string | null;
};

/** By our own profile id first (set server-side at checkout), then by Paddle ids. */
async function findProfile(facts: PaddleFacts): Promise<ProfileRow | null> {
  const supabase = createSupabaseAdminClient();
  const columns = "id, paddle_customer_id, paddle_subscription_id, subscription_synced_at";

  if (facts.profileId) {
    const { data } = await supabase
      .from("profiles")
      .select(columns)
      .eq("id", facts.profileId)
      .maybeSingle();
    if (data) return data;
  }
  if (facts.subscriptionId) {
    const { data } = await supabase
      .from("profiles")
      .select(columns)
      .eq("paddle_subscription_id", facts.subscriptionId)
      .maybeSingle();
    if (data) return data;
  }
  if (facts.customerId) {
    const { data } = await supabase
      .from("profiles")
      .select(columns)
      .eq("paddle_customer_id", facts.customerId)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function mark(facts: PaddleFacts, profileId: string | null, outcome: string) {
  const { error } = await createSupabaseAdminClient().from("paddle_webhook_events").upsert(
    {
      event_id: facts.eventId,
      event_type: facts.eventType,
      occurred_at: facts.occurredAt,
      profile_id: profileId,
      outcome,
    },
    { onConflict: "event_id", ignoreDuplicates: true },
  );
  if (error) console.error("[paddle] could not mark event", facts.eventId, error.code);
}
