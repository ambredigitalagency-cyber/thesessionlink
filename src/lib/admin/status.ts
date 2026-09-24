/**
 * How a coach's account reads at a glance, and what the platform totals say.
 *
 * Pure functions over the columns the console already loads, so the badges, the
 * filters and the figures can never disagree with each other.
 */

export const ACCOUNT_STATUSES = ["deleted", "suspended", "subscribed", "trial", "expired"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type AccountFields = {
  trial_ends_at: string | null;
  subscription_active: boolean | null;
  suspended_at: string | null;
  /** The coach asked to leave; the account is awaiting its purge. */
  deleted_at?: string | null;
};

/**
 * A pending deletion wins over everything, then suspension — both are
 * decisions, not states of the subscription. Then a paid subscription, then an
 * unfinished trial.
 */
export function accountStatus(account: AccountFields, now = new Date()): AccountStatus {
  if (account.deleted_at) return "deleted";
  if (account.suspended_at) return "suspended";
  if (account.subscription_active) return "subscribed";
  if (account.trial_ends_at && new Date(account.trial_ends_at).getTime() > now.getTime()) {
    return "trial";
  }
  return "expired";
}

export function trialDaysLeft(account: AccountFields, now = new Date()): number {
  if (!account.trial_ends_at) return 0;
  const ms = new Date(account.trial_ends_at).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export type PlatformTotals = {
  coaches: number;
  byStatus: Record<AccountStatus, number>;
  /** Subscribers × the monthly price. Declarative: no payment is tracked. */
  monthlyRevenue: number;
  categories: { label: string; count: number }[];
};

export function platformTotals(
  accounts: (AccountFields & { category_name: unknown; locale?: string | null })[],
  options: { monthlyPrice: number; locale: string; now?: Date; unknownLabel: string },
): PlatformTotals {
  const { monthlyPrice, locale, now = new Date(), unknownLabel } = options;

  const byStatus: Record<AccountStatus, number> = {
    deleted: 0,
    suspended: 0,
    subscribed: 0,
    trial: 0,
    expired: 0,
  };
  const perCategory = new Map<string, number>();

  for (const account of accounts) {
    const status = accountStatus(account, now);
    byStatus[status] += 1;

    // An account waiting to be purged is not part of the active mix.
    if (status === "deleted") continue;

    const label = localisedCategory(account.category_name, locale) ?? unknownLabel;
    perCategory.set(label, (perCategory.get(label) ?? 0) + 1);
  }

  return {
    coaches: accounts.length,
    byStatus,
    monthlyRevenue: byStatus.subscribed * monthlyPrice,
    categories: [...perCategory.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** activity_categories.name is a { en, fr } map. */
function localisedCategory(value: unknown, locale: string): string | null {
  if (!value || typeof value !== "object") return null;
  const map = value as Record<string, unknown>;
  const candidate = map[locale] ?? map.en ?? Object.values(map)[0];
  return typeof candidate === "string" ? candidate : null;
}

/** Signups grouped by month, oldest first, for the trend chart. */
export function signupsByMonth(
  accounts: { created_at: string }[],
  months = 12,
  now = new Date(),
): { key: string; count: number }[] {
  const buckets = new Map<string, number>();

  for (let index = months - 1; index >= 0; index--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    buckets.set(date.toISOString().slice(0, 7), 0);
  }

  for (const account of accounts) {
    const key = account.created_at.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([key, count]) => ({ key, count }));
}
