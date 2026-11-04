/**
 * The sign-up's steps, and where an account stands in them.
 *
 *   category    the trade (cards, one tap)
 *   identity    the name and the link — the profile row is written here
 *   button      the main button — the page goes live here
 *   appearance  the theme
 *   done        finished: never sent back to the sign-up again
 *
 * The step is worked out from the account's data first, the stored progress
 * second: a profile that exists is past the link, a published page is past
 * the button, whatever the progress row says. The row only adds what the data
 * cannot tell — the trade picked before any profile exists, and whether the
 * appearance screen was passed.
 */

export const STEPS = ["category", "identity", "button", "appearance", "done"] as const;
export type Step = (typeof STEPS)[number];

/** The four screens with a place in the progress bar. */
export const SCREENS = ["category", "identity", "button", "appearance"] as const;
export type Screen = (typeof SCREENS)[number];

export function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

export function stepRank(step: Step): number {
  return STEPS.indexOf(step);
}

export function resolveStep({
  profile,
  progress,
}: {
  profile: { published: boolean } | null;
  progress: { step: string; categoryId: string | null } | null;
}): Step {
  if (!profile) return progress?.categoryId ? "identity" : "category";
  if (!profile.published) return "button";
  // A page published without any progress row predates this sign-up: done.
  if (!progress || !isStep(progress.step)) return "done";
  return progress.step === "done" ? "done" : "appearance";
}

/**
 * Which screens someone at `current` may open. Behind them: only the trade,
 * and only before the link is written — past it, the trade is changed in
 * "Ma page" and the link is reserved. Ahead of them: nothing.
 */
export function canOpen(screen: Screen, current: Step): boolean {
  if (screen === current) return true;
  return screen === "category" && current === "identity";
}
