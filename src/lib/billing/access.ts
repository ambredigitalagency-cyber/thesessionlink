/**
 * Where an account stands with its subscription — the app's copy of
 * access_state_at() (migration 20261104000001), which stays the authority for
 * what the database exposes. Both run the same test matrix
 * (access.test.ts and access-sql.test.ts), so they cannot drift apart.
 *
 *   trial       the platform's 14-day trial is running
 *   subscribed  an active subscription (past_due included) or switched on by
 *               an admin
 *   grace       trial or paid period over, no subscription, for less than
 *               7 days: dashboard locked, page still online
 *   expired     past that: dashboard locked, page offline
 *
 * Suspension and pending deletion are decided earlier and elsewhere; they win
 * over all of this.
 */

export const GRACE_DAYS = 7;
const DAY = 86_400_000;

export const ACCESS_STATES = ["trial", "subscribed", "grace", "expired"] as const;
export type AccessState = (typeof ACCESS_STATES)[number];

export type AccessFields = {
  trial_ends_at: string | null;
  subscription_active: boolean | null;
  subscription_ended_at?: string | null;
};

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : null);

/** When access ended or ends: the later of the trial's end and the last subscription's. */
export function accessEndsAt(account: AccessFields): Date | null {
  const trial = time(account.trial_ends_at);
  const ended = time(account.subscription_ended_at);
  if (trial === null && ended === null) return null;
  return new Date(Math.max(trial ?? -Infinity, ended ?? -Infinity));
}

/** When the page goes (or went) offline without a subscription. */
export function offlineAt(account: AccessFields): Date | null {
  const end = accessEndsAt(account);
  return end ? new Date(end.getTime() + GRACE_DAYS * DAY) : null;
}

export function accessState(account: AccessFields, now: Date): AccessState {
  if (account.subscription_active) return "subscribed";
  const trial = time(account.trial_ends_at);
  if (trial !== null && now.getTime() < trial) return "trial";
  const offline = offlineAt(account);
  if (offline && now.getTime() < offline.getTime()) return "grace";
  return "expired";
}

/** The dashboard is locked: only subscribing, billing, support and leaving remain. */
export function isLocked(state: AccessState): boolean {
  return state === "grace" || state === "expired";
}
