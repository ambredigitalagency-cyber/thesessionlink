"use client";

import { Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { NoClientsArt } from "@/components/dashboard/empty-illustrations";
import { Badge, EmptyState, ProfileAvatar } from "@/components/ui/primitives";
import { SEGMENTS, segmentsByClient, tagVocabulary, type Segment } from "@/lib/crm/segments";
import { cn } from "@/lib/utils";

export type ClientSummary = {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  tags: string[];
  bookings_count: number;
  pending_count: number;
  recent_bookings_count: number;
  last_booking_at: string | null;
  next_session_at: string | null;
  /** Declarative, like the statistics page: offer price × confirmed bookings. */
  spent: number;
};

type Filter =
  { kind: "all" } | { kind: "tag"; value: string } | { kind: "segment"; value: Segment };

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
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  // One ranking pass for the whole list: "top spender" is relative to the others.
  const segments = useMemo(() => segmentsByClient(clients), [clients]);
  const tags = useMemo(() => tagVocabulary(clients), [clients]);
  const usedSegments = useMemo(
    () => SEGMENTS.filter((segment) => clients.some((c) => segments.get(c.id)?.includes(segment))),
    [clients, segments],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return clients.filter((client) => {
      if (
        search &&
        !`${client.name} ${client.email} ${client.phone ?? ""}`.toLowerCase().includes(search)
      ) {
        return false;
      }
      if (filter.kind === "tag") return client.tags.includes(filter.value);
      if (filter.kind === "segment") return segments.get(client.id)?.includes(filter.value);
      return true;
    });
  }, [clients, query, filter, segments]);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
      active
        ? "border-ink bg-ink text-ink-inverse"
        : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
    );

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

      {tags.length > 0 || usedSegments.length > 0 ? (
        <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            type="button"
            onClick={() => setFilter({ kind: "all" })}
            className={chip(filter.kind === "all")}
          >
            {t("filterAll")}
          </button>

          {usedSegments.map((segment) => (
            <button
              key={segment}
              type="button"
              onClick={() =>
                setFilter(
                  filter.kind === "segment" && filter.value === segment
                    ? { kind: "all" }
                    : { kind: "segment", value: segment },
                )
              }
              className={chip(filter.kind === "segment" && filter.value === segment)}
            >
              {t(`segments.${segment}` as "segments.loyal")}
            </button>
          ))}

          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setFilter(
                  filter.kind === "tag" && filter.value === tag
                    ? { kind: "all" }
                    : { kind: "tag", value: tag },
                )
              }
              className={chip(filter.kind === "tag" && filter.value === tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          // The drawing belongs to "no clients yet"; a filter that matches
          // nothing is a different, smaller problem and keeps the plain icon.
          illustration={filter.kind === "all" ? <NoClientsArt className="h-24 w-32" /> : undefined}
          icon={filter.kind === "all" ? undefined : <UserRound className="size-5" />}
          title={filter.kind === "all" ? t("emptyTitle") : t("filterNone")}
          description={filter.kind === "all" ? t("emptyBody") : undefined}
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
                  {client.tags.length > 0 || (segments.get(client.id) ?? []).length > 0 ? (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5">
                      {(segments.get(client.id) ?? []).map((segment) => (
                        <Badge key={segment} tone={segment === "inactive" ? "neutral" : "accent"}>
                          {t(`segments.${segment}` as "segments.loyal")}
                        </Badge>
                      ))}
                      {client.tags.map((tag) => (
                        <Badge key={tag} tone="outline">
                          {tag}
                        </Badge>
                      ))}
                    </p>
                  ) : null}
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
