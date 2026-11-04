import type { Tables } from "@/lib/supabase/database.types";

/**
 * TheSessionLink has a single plan: everything is included and nothing is
 * gated per account. Billed through Paddle (src/lib/billing), after a 14-day
 * trial; what happens when it ends is src/lib/billing/access.ts.
 */
export const PLAN_PRICE_MONTHLY = 19;

/**
 * Listed on the pricing card, in order. Each key is a `landing.pricing.feature`
 * translation.
 */
export const PLAN_FEATURES = ["page", "blocks", "tracking", "links", "support"] as const;

type TrialFields = Pick<Tables<"profiles">, "trial_ends_at" | "subscription_active">;

/** True while the pro is inside their 14-day trial and not yet paying. */
export function isOnTrial(profile: TrialFields): boolean {
  return !profile.subscription_active && new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function trialDaysLeft(profile: TrialFields): number {
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
