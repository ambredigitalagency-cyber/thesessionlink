import type { AccountStatus } from "@/lib/admin/status";

/**
 * Status, as a colour — shared by the list and the coach's own page so that a
 * row and the page it opens agree on what "on trial" looks like.
 *
 * The bar is the only place the console lets a status be colour alone, and even
 * there the word sits beside it: the colour buys the glance, the word carries
 * the meaning.
 */
export const STATUS_BAR: Record<AccountStatus, string> = {
  subscribed: "bg-success",
  trial: "bg-[var(--console-accent)]",
  grace: "bg-warning",
  expired: "bg-ink-subtle",
  suspended: "bg-danger",
  deleted: "bg-danger",
};

export const STATUS_TEXT: Record<AccountStatus, string> = {
  subscribed: "text-success",
  trial: "text-[var(--console-accent-ink)]",
  grace: "text-warning",
  expired: "text-ink-muted",
  suspended: "text-danger",
  deleted: "text-danger",
};

/** The same six states as a chip, for the one page that shows a single coach. */
export const STATUS_CHIP: Record<AccountStatus, string> = {
  subscribed: "bg-success-soft text-success",
  trial: "bg-[var(--console-accent-soft)] text-[var(--console-accent-ink)]",
  grace: "bg-warning-soft text-warning",
  expired: "bg-ink/5 text-ink-muted",
  suspended: "bg-danger-soft text-danger",
  deleted: "bg-danger-soft text-danger",
};
