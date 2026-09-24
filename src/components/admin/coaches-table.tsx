"use client";

import { ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/primitives";
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

const STATUS_TONE: Record<AccountStatus, "success" | "accent" | "warning" | "danger"> = {
  subscribed: "success",
  trial: "accent",
  expired: "warning",
  suspended: "danger",
  deleted: "danger",
};

export function AdminCoaches({ coaches }: { coaches: CoachRow[] }) {
  const t = useTranslations("admin");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "created_at",
    desc: true,
  });

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
    <th scope="col" className={cn("pb-2 font-normal", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() =>
          setSort((current) => ({ key, desc: current.key === key ? !current.desc : true }))
        }
        className={cn(
          "hover:text-ink inline-flex items-center gap-1 transition-colors",
          sort.key === key && "text-ink font-medium",
        )}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-ink text-[15px] font-semibold">
          {t("coaches.title", { count: coaches.length })}
        </h2>

        <div className="relative w-full sm:w-64">
          <Search className="text-ink-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("coaches.search")}
            className="border-line-strong bg-surface text-ink placeholder:text-ink-subtle focus:border-ink h-10 w-full rounded-full border pr-3 pl-9 text-[14px] focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", ...ACCOUNT_STATUSES] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              status === option
                ? "border-ink bg-ink text-ink-inverse"
                : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
            )}
          >
            {option === "all" ? t("coaches.all") : t(`status.${option}`)}
          </button>
        ))}
      </div>

      <div className="-mx-5 mt-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[46rem] text-[13.5px]">
          <thead>
            <tr className="text-ink-subtle border-line border-b text-left">
              {header("display_name", t("coaches.name"))}
              <th scope="col" className="pb-2 font-normal">
                {t("coaches.status")}
              </th>
              {header("created_at", t("coaches.signedUp"))}
              {header("offers_count", t("coaches.offers"), "right")}
              {header("bookings_count", t("coaches.bookings"), "right")}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((coach) => {
              const state = accountStatus(coach);
              return (
                <tr key={coach.id} className="hover:bg-ink/[0.02]">
                  <td className="py-2.5">
                    <Link
                      href={`/admin/coaches/${coach.id}`}
                      className="text-ink font-medium underline-offset-4 hover:underline"
                    >
                      {coach.display_name}
                    </Link>
                    <p className="text-ink-subtle text-[12.5px]">
                      {coach.contact_email ?? `/${coach.slug}`}
                    </p>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={STATUS_TONE[state]}>{t(`status.${state}`)}</Badge>
                    {coach.deleted_at ? (
                      <p className="text-ink-subtle mt-1 text-[12px]">
                        {t("coaches.purgeIn", { count: deletionDaysLeft(coach.deleted_at) })}
                      </p>
                    ) : null}
                  </td>
                  <td className="text-ink-muted py-2.5 tabular-nums">{format(coach.created_at)}</td>
                  <td className="text-ink-muted py-2.5 text-right tabular-nums">
                    {coach.offers_count}
                  </td>
                  <td className="text-ink-muted py-2.5 text-right tabular-nums">
                    {coach.bookings_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="text-ink-subtle py-8 text-center text-[13px]">{t("coaches.none")}</p>
        ) : null}
      </div>
    </section>
  );
}
