import type { Enums, Tables } from "@/lib/supabase/database.types";

export type PlanType = Enums<"plan_type">;

export const PLANS = ["free", "base", "premium"] as const;

export type PlanLimits = {
  /** null = unlimited. */
  maxOffers: number | null;
  /** null = unlimited. */
  maxPhotosPerOffer: number | null;
  /** Client records, history and private notes. */
  crm: boolean;
  /** Automatic reminder emails before a session. */
  reminders: boolean;
};

/**
 * The single source of truth for what each plan allows. Server actions, pages
 * and the pricing section all read from here — never hard-code a limit.
 *
 * Prices are in euros per month and are shown on the landing page; billing is
 * not connected yet (see profiles.subscription_active).
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: { maxOffers: 1, maxPhotosPerOffer: 1, crm: false, reminders: false },
  base: { maxOffers: null, maxPhotosPerOffer: 5, crm: true, reminders: true },
  premium: { maxOffers: null, maxPhotosPerOffer: null, crm: true, reminders: true },
};

export const PLAN_PRICES: Record<PlanType, { monthly: number; yearly: number | null }> = {
  free: { monthly: 0, yearly: null },
  base: { monthly: 15, yearly: 144 },
  premium: { monthly: 25, yearly: 240 },
};

/** Plans a pro can move up to, cheapest first — used to word the upsell. */
export const UPGRADE_PATH: Record<PlanType, PlanType | null> = {
  free: "base",
  base: "premium",
  premium: null,
};

type PlanFields = Pick<Tables<"profiles">, "plan_type" | "trial_ends_at" | "subscription_active">;

/**
 * The plan that actually applies right now.
 *
 * `plan_type` alone is not enough: expire_trials() only runs once a day, so a
 * lapsed trial still reads as base/premium in the column until then. Mirrors
 * public.effective_plan() in SQL — keep the two in step.
 */
export function effectivePlan(profile: PlanFields): PlanType {
  if (profile.subscription_active) return profile.plan_type;
  if (new Date(profile.trial_ends_at).getTime() > Date.now()) return profile.plan_type;
  return "free";
}

export function planLimits(profile: PlanFields): PlanLimits {
  return PLAN_LIMITS[effectivePlan(profile)];
}

/** True while the pro is inside their 14-day trial and not yet paying. */
export function isOnTrial(profile: PlanFields): boolean {
  return !profile.subscription_active && new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function trialDaysLeft(profile: PlanFields): number {
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** null = unlimited, so anything is under the cap. */
export function isWithinLimit(count: number, limit: number | null): boolean {
  return limit === null || count <= limit;
}
