import type { ActionType } from "./schema";

/**
 * The questions the offer builder asks, in order.
 *
 * "Essentials" used to be one screen carrying the title, the description, the
 * price, the choice between five action types and every setting belonging to
 * whichever one was picked — thirty-odd controls, most of them irrelevant
 * until the action type was decided. It is now three questions: what happens
 * when someone clicks, what you are selling, and how that action behaves. The
 * first one comes first because it decides what the other two even mean.
 */
export const OFFER_PHASES = [
  "action",
  "hours",
  "basics",
  "settings",
  "details",
  "photos",
  "review",
] as const;
export type OfferPhase = (typeof OFFER_PHASES)[number];

/**
 * The questions for one offer. "hours" is asked only where the builder is
 * told to (the first offer, inside onboarding) and only for a calendar offer:
 * it is the one action type that sells the weekly hours, so it is the one that
 * needs them before going on. Every other offer goes straight from the action
 * to the basics, and never hears about hours.
 */
export function offerPhasesFor(askHours: boolean, actionType: ActionType): readonly OfferPhase[] {
  return askHours && actionType === "calendar_booking"
    ? OFFER_PHASES
    : OFFER_PHASES.filter((phase) => phase !== "hours");
}
