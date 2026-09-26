import type { Tables } from "@/lib/supabase/database.types";

/**
 * TheSessionLink has a single plan: everything is included (unlimited offers
 * and photos, CRM, automatic reminders) and nothing is gated per account.
 *
 * The price is shown on the landing page; billing is not connected yet (see
 * profiles.subscription_active).
 */
export const PLAN_PRICE_MONTHLY = 19;

/**
 * Listed on the pricing card, in order. Each key is a `landing.pricing.feature`
 * translation.
 */
export const PLAN_FEATURES = [
  "offersUnlimited",
  "photosUnlimited",
  "crm",
  "reminders",
  "noCommission",
] as const;

type TrialFields = Pick<Tables<"profiles">, "trial_ends_at" | "subscription_active">;

/**
 * True while the pro is inside their 14-day trial and not yet paying.
 *
 * Nothing is locked when this turns false: payments are not wired yet. The
 * trial will require a bank card, but that belongs in the signup flow once
 * Stripe/PayPal is integrated — until then signup is never blocked.
 */
export function isOnTrial(profile: TrialFields): boolean {
  return !profile.subscription_active && new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function trialDaysLeft(profile: TrialFields): number {
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
