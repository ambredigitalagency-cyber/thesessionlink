"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * The audit log as a table. Admin identities are shown as the account id the
 * log stores: with one owner today, resolving them to e-mails would mean
 * reading auth.users, which the console has no policy for.
 *
 * The rebuild changed how an entry is read, not what it says. An action now
 * carries a dot in the colour of what it did — something taken away, something
 * given back, something merely looked at — because a log is scanned for the one
 * line that matters, and four columns of identical grey make that a reading
 * exercise. The details stay in a monospaced face: they are machine output, and
 * pretending otherwise makes them harder to compare line to line.
 */
export type AuditEntry = {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
  admin_user_id: string;
  target?: { display_name: string | null; id: string } | null;
};

/** What the action did, as a colour. Unlisted actions stay neutral. */
const ACTION_TONE: Record<string, string> = {
  suspend: "bg-danger",
  unsuspend: "bg-success",
  restore_account: "bg-success",
  extend_trial: "bg-[var(--console-accent)]",
  set_subscription: "bg-[var(--console-accent)]",
  impersonate_start: "bg-warning",
  impersonate_stop: "bg-line-strong",
};

export function AuditTrail({
  entries,
  showTarget = false,
}: {
  entries: AuditEntry[];
  showTarget?: boolean;
}) {
  const t = useTranslations("admin");

  if (entries.length === 0) {
    return <p className="text-ink-subtle text-[13px]">{t("audit.empty")}</p>;
  }

  const when = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[34rem] text-[13px]">
        <thead>
          <tr className="text-ink-subtle border-line border-b text-left text-[12.5px]">
            <th scope="col" className="pb-2.5 font-normal">
              {t("audit.when")}
            </th>
            <th scope="col" className="px-3 pb-2.5 font-normal">
              {t("audit.action")}
            </th>
            {showTarget ? (
              <th scope="col" className="px-3 pb-2.5 font-normal">
                {t("audit.target")}
              </th>
            ) : null}
            <th scope="col" className="pb-2.5 pl-3 font-normal">
              {t("audit.details")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-[var(--console-accent-soft)]/50">
              <td className="text-ink-muted py-2.5 whitespace-nowrap tabular-nums">
                {when.format(new Date(entry.created_at))}
              </td>
              <td className="text-ink px-3 py-2.5 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      ACTION_TONE[entry.action] ?? "bg-line-strong",
                    )}
                  />
                  {t(`audit.actions.${entry.action}` as "audit.actions.suspend")}
                </span>
              </td>
              {showTarget ? (
                <td className="text-ink-muted px-3 py-2.5">
                  {entry.target?.display_name ?? t("audit.noTarget")}
                </td>
              ) : null}
              <td className="text-ink-subtle py-2.5 pl-3 font-mono text-[12px]">
                {summarise(entry.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Details are a small JSON object; show it as "key: value", never raw JSON. */
function summarise(details: unknown): string {
  if (!details || typeof details !== "object") return "—";
  const entries = Object.entries(details as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) return "—";

  return entries
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" · ");
}
