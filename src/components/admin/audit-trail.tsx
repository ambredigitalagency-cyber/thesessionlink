"use client";

import { useTranslations } from "next-intl";

/**
 * The audit log as a table. Admin identities are shown as the account id the
 * log stores: with one owner today, resolving them to e-mails would mean
 * reading auth.users, which the console has no policy for.
 */
export type AuditEntry = {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
  admin_user_id: string;
  target?: { display_name: string | null; id: string } | null;
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
          <tr className="text-ink-subtle border-line border-b text-left">
            <th scope="col" className="pb-2 font-normal">
              {t("audit.when")}
            </th>
            <th scope="col" className="pb-2 font-normal">
              {t("audit.action")}
            </th>
            {showTarget ? (
              <th scope="col" className="pb-2 font-normal">
                {t("audit.target")}
              </th>
            ) : null}
            <th scope="col" className="pb-2 font-normal">
              {t("audit.details")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="text-ink-muted py-2.5 whitespace-nowrap tabular-nums">
                {when.format(new Date(entry.created_at))}
              </td>
              <td className="text-ink py-2.5 font-medium">
                {t(`audit.actions.${entry.action}` as "audit.actions.suspend")}
              </td>
              {showTarget ? (
                <td className="text-ink-muted py-2.5">
                  {entry.target?.display_name ?? t("audit.noTarget")}
                </td>
              ) : null}
              <td className="text-ink-muted py-2.5">{summarise(entry.details)}</td>
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
