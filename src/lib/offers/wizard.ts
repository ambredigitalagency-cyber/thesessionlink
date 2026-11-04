/**
 * The questions the offer builder asks, in order.
 *
 * "Essentials" used to be one screen carrying the title, the description, the
 * price, the choice of action type and every setting belonging to whichever
 * one was picked — most of them irrelevant until the action type was decided.
 * It is now three questions: what happens when someone clicks, what you are
 * offering, and how that action behaves. The first one comes first because it
 * decides what the other two even mean.
 */
export const OFFER_PHASES = [
  "action",
  "basics",
  "settings",
  "details",
  "photos",
  "review",
] as const;
export type OfferPhase = (typeof OFFER_PHASES)[number];
