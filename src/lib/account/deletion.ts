/**
 * When a coach asks for their account to be deleted, and what happens next.
 *
 * The click marks the profile; the account stops working straight away but
 * nothing is erased. A nightly job performs the real deletion once the grace
 * period has run out, so a coach who changes their mind — or deleted by
 * mistake — can be brought back by an admin until then.
 *
 * The same number of days is written in three places that must agree: this
 * constant, the copy the coach reads before confirming, and the default
 * argument of purge_deleted_accounts() in the database. Change one, change all.
 */
export const DELETION_GRACE_DAYS = 30;

const DAY_MS = 86_400_000;

/** The moment the purge becomes eligible to run on this account. */
export function deletionDueAt(deletedAt: string | Date): Date {
  const from = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt;
  return new Date(from.getTime() + DELETION_GRACE_DAYS * DAY_MS);
}

/** Days left before the purge, rounded up; never negative. */
export function deletionDaysLeft(deletedAt: string | Date, now = new Date()): number {
  const ms = deletionDueAt(deletedAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}
