import type { AccessFields, AccessState } from "./access";

/**
 * The cases both copies of the access rule must agree on — the app's
 * (access.ts) and the database's (access_state_at). One list, run by both
 * access.test.ts and access-sql.test.ts.
 */
export const NOW = new Date("2026-11-04T12:00:00Z");
const DAY = 86_400_000;
const at = (days: number, extraMs = 0) =>
  new Date(NOW.getTime() + days * DAY + extraMs).toISOString();

export const ACCESS_MATRIX: { name: string; fields: AccessFields; expected: AccessState }[] = [
  {
    name: "trial running",
    fields: { trial_ends_at: at(5), subscription_active: false },
    expected: "trial",
  },
  {
    name: "last day of the trial",
    fields: { trial_ends_at: at(0, 3_600_000), subscription_active: false },
    expected: "trial",
  },
  {
    name: "grace, day 1",
    fields: { trial_ends_at: at(-1), subscription_active: false },
    expected: "grace",
  },
  {
    name: "grace, day 6",
    fields: { trial_ends_at: at(-6), subscription_active: false },
    expected: "grace",
  },
  {
    name: "grace, last minute of day 7",
    fields: { trial_ends_at: at(-7, 60_000), subscription_active: false },
    expected: "grace",
  },
  {
    name: "day 7: offline",
    fields: { trial_ends_at: at(-7), subscription_active: false },
    expected: "expired",
  },
  {
    name: "long expired",
    fields: { trial_ends_at: at(-40), subscription_active: false },
    expected: "expired",
  },
  {
    name: "subscribed (active)",
    fields: { trial_ends_at: at(-40), subscription_active: true },
    expected: "subscribed",
  },
  {
    name: "past_due still counts as subscribed",
    fields: { trial_ends_at: at(-40), subscription_active: true, subscription_ended_at: null },
    expected: "subscribed",
  },
  {
    name: "canceled, paid period still running (Paddle keeps it active)",
    fields: { trial_ends_at: at(-40), subscription_active: true },
    expected: "subscribed",
  },
  {
    name: "canceled, paid period over 2 days ago: grace",
    fields: { trial_ends_at: at(-40), subscription_active: false, subscription_ended_at: at(-2) },
    expected: "grace",
  },
  {
    name: "canceled, paid period over 8 days ago: expired",
    fields: { trial_ends_at: at(-40), subscription_active: false, subscription_ended_at: at(-8) },
    expected: "expired",
  },
  {
    name: "canceled during the trial: the trial runs on",
    fields: { trial_ends_at: at(4), subscription_active: false, subscription_ended_at: at(-1) },
    expected: "trial",
  },
  {
    name: "switched on by an admin, no Paddle subscription",
    fields: { trial_ends_at: at(-90), subscription_active: true, subscription_ended_at: null },
    expected: "subscribed",
  },
  {
    name: "switched off by an admin 3 days ago",
    fields: { trial_ends_at: at(-90), subscription_active: false, subscription_ended_at: at(-3) },
    expected: "grace",
  },
];
