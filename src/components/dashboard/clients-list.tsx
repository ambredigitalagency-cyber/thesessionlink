"use client";

import { Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge, EmptyState, ProfileAvatar } from "@/components/ui/primitives";

export type ClientSummary = {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  bookings_count: number;
  pending_count: number;
  last_booking_at: string | null;
  next_session_at: string | null;
};

export function ClientsList({
  clients,
  timezone,
  locale,
}: {
  clients: ClientSummary[];
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.clients");
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) =>
      `${client.name} ${client.email} ${client.phone ?? ""}`.toLowerCase().includes(search),
    );
  }, [clients, query]);

  const format = (value: string, withTime = false) =>
    new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "short",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      timeZone: timezone,
    }).format(new Date(value));

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-sm">
        <Search className="text-ink-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="border-line-strong bg-surface text-ink placeholder:text-ink-subtle focus:border-ink h-10 w-full rounded-full border pr-3 pl-9 text-[14px] focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserRound className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((client) => (
            <li key={client.id}>
              <Link
                href={`/dashboard/bookings/clients/${client.id}`}
                className="border-line bg-surface hover:border-ink/20 flex items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors"
              >
                <ProfileAvatar name={client.name} className="size-10 text-[13px]" />

                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-[15px] font-medium">{client.name}</p>
                  <p className="text-ink-muted truncate text-[13px]">{client.email}</p>
                </div>

                <div className="hidden text-right sm:block">
                  {client.next_session_at ? (
                    <p className="text-ink text-[13px] font-medium">
                      {t("next", { date: format(client.next_session_at, true) })}
                    </p>
                  ) : client.last_booking_at ? (
                    <p className="text-ink-muted text-[13px]">
                      {t("last", { date: format(client.last_booking_at) })}
                    </p>
                  ) : null}
                  <p className="text-ink-subtle text-[12px]">
                    {t("bookingsCount", { count: client.bookings_count })}
                  </p>
                </div>

                {client.pending_count > 0 ? (
                  <Badge tone="warning">{client.pending_count}</Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
