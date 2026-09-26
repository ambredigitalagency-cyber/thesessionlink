"use client";

import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConsolePanel } from "@/components/admin/console-kpi";
import { STATUS_BAR, STATUS_TEXT } from "@/components/admin/status-tone";
import { deletionDaysLeft } from "@/lib/account/deletion";
import { ACCOUNT_STATUSES, accountStatus, type AccountStatus } from "@/lib/admin/status";
import { cn } from "@/lib/utils";

export type CoachRow = {
  id: string;
  display_name: string;
  slug: string;
  contact_email: string | null;
  created_at: string;
  trial_ends_at: string | null;
  subscription_active: boolean | null;
  suspended_at: string | null;
  deleted_at: string | null;
  offers_count: number;
  bookings_count: number;
  category_name: unknown;
};

type SortKey = "created_at" | "display_name" | "bookings_count" | "offers_count";

/**
 * The filters, in the order an account lives them.
 *
 * `ACCOUNT_STATUSES` is ordered by precedence — deleted beats suspended beats
 * subscribed — because that is what `accountStatus()` needs. Read as a row of
 * buttons it comes out backwards, opening on the two states nobody is looking
 * for. The console orders them by life: paying, trying, lapsed, then the two
 * that are over.
 */
const FILTER_ORDER = ["subscribed", "trial", "expired", "suspended", "deleted"] as const;

/**
 * Every coach on the platform, filterable and sortable.
 *
 * Still a table, because this is tabular data and a table is what lets someone
 * compare a hundred rows. What changed is that a row is now a destination:
 * the whole row is the link, it says so on hover, and the status is read
 * before the name rather than after it.
 */
export function AdminCoaches({ coaches }: { coaches: CoachRow[] }) {
  const t = useTranslations("admin");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "created_at",
    desc: true,
  });

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: coaches.length };
    for (const state of ACCOUNT_STATUSES) out[state] = 0;
    for (const coach of coaches) out[accountStatus(coach)] += 1;
    return out;
  }, [coaches]);

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();

    const filtered = coaches.filter((coach) => {
      if (status !== "all" && accountStatus(coach) !== status) return false;
      if (!search) return true;
      return `${coach.display_name} ${coach.contact_email ?? ""} ${coach.slug}`
        .toLowerCase()
        .includes(search);
    });

    return [...filtered].sort((a, b) => {
      const direction = sort.desc ? -1 : 1;
      if (sort.key === "display_name") {
        return a.display_name.localeCompare(b.display_name) * direction;
      }
      if (sort.key === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
      }
      return (a[sort.key] - b[sort.key]) * direction;
    });
  }, [coaches, query, status, sort]);

  const format = (value: string) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(value),
    );

  const header = (key: SortKey, label: string, align: "left" | "right" = "left") => (
    <th
      scope="col"
      className={cn("px-3 pb-2.5 font-normal first:pl-0", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() =>
          setSort((current) => ({ key, desc: current.key === key ? !current.desc : true }))
        }
        aria-label={t("coaches.sortBy", { column: label })}
        className={cn(
          "hover:text-ink inline-flex items-center gap-1 transition-colors",
          sort.key === key && "text-ink font-medium",
        )}
      >
        {label}
        <ArrowUpDown className={cn("size-3", sort.key === key && "text-[var(--console-accent)]")} />
      </button>
    </th>
  );

  return (
    <ConsolePanel
      index={6}
      title={t("coaches.title", { count: coaches.length })}
      hint={
        rows.length !== coaches.length
          ? t("coaches.showing", { shown: rows.length, total: coaches.length })
          : undefined
      }
      action={
        <div className="relative w-full sm:w-64">
          <Search className="text-ink-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("coaches.search")}
            aria-label={t("coaches.search")}
            className="border-line-strong bg-canvas text-ink placeholder:text-ink-subtle h-10 w-full rounded-full border pr-3 pl-9 text-[14px] transition-colors focus:border-[var(--console-accent)] focus:outline-none"
          />
        </div>
      }
      className="overflow-hidden"
    >
      <div className="flex flex-wrap gap-2">
        {(["all", ...FILTER_ORDER] as const).map((option) => {
          const on = status === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                on
                  ? "border-[var(--console-accent)] bg-[var(--console-accent-soft)] text-[var(--console-accent-ink)]"
                  : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
              )}
            >
              {option === "all" ? t("coaches.all") : t(`status.${option}`)}
              <span className={cn("tabular-nums", on ? "opacity-70" : "text-ink-subtle")}>
                {counts[option] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="-mx-5 mt-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[46rem] text-[13.5px]">
          <thead>
            <tr className="text-ink-subtle border-line border-b text-left text-[12.5px]">
              {header("display_name", t("coaches.name"))}
              {header("created_at", t("coaches.signedUp"))}
              {header("offers_count", t("coaches.offers"), "right")}
              {header("bookings_count", t("coaches.bookings"), "right")}
              <th scope="col" className="w-8 pb-2.5" />
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((coach) => {
              const state = accountStatus(coach);
              return (
                // `relative` is load-bearing: it makes the row the containing
                // block for the name link's stretched ::after. Without it the
                // overlay resolves against an ancestor and swallows the clicks
                // on the sort buttons above.
                <tr
                  key={coach.id}
                  className="group relative hover:bg-[var(--console-accent-soft)]/60"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={cn("mt-1 h-8 w-0.5 shrink-0 rounded-full", STATUS_BAR[state])}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/coaches/${coach.id}`}
                          className="text-ink font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {coach.display_name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px]">
                          <span className={cn("font-medium", STATUS_TEXT[state])}>
                            {t(`status.${state}`)}
                          </span>
                          <span className="text-ink-subtle truncate">
                            {coach.contact_email ?? `/${coach.slug}`}
                          </span>
                        </p>
                        {coach.deleted_at ? (
                          <p className="text-danger mt-0.5 text-[12px]">
                            {t("coaches.purgeIn", { count: deletionDaysLeft(coach.deleted_at) })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-muted px-3 py-3 tabular-nums">
                    {format(coach.created_at)}
                  </td>
                  <td className="text-ink-muted px-3 py-3 text-right tabular-nums">
                    {coach.offers_count}
                  </td>
                  <td className="text-ink-muted px-3 py-3 text-right tabular-nums">
                    {coach.bookings_count}
                  </td>
                  <td className="py-3 pl-3">
                    <ChevronRight
                      aria-hidden
                      className="text-ink-subtle size-4 transition-colors group-hover:text-[var(--console-accent)]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="text-ink-subtle py-10 text-center text-[13px]">{t("coaches.none")}</p>
        ) : null}
      </div>
    </ConsolePanel>
  );
}
