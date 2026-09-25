"use client";

import {
  CalendarClock,
  LayoutGrid,
  Loader2,
  Search,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, VisuallyHidden } from "radix-ui";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { searchDashboard, type SearchHit } from "@/actions/search";
import { cn } from "@/lib/utils";

/**
 * Jump to anything from anywhere: Cmd+K, or Ctrl+K.
 *
 * NO NEW DEPENDENCY — the obvious answer was shadcn's Command, which is a
 * wrapper around `cmdk`. Neither is installed, and cmdk brings its own
 * filtering, scoring and virtual list for a search that is already done on the
 * server over at most fifteen results. What was actually needed — a dialog,
 * a text field, arrow keys and Enter — is a hundred lines on top of the Radix
 * Dialog this product already ships and already styles.
 *
 * Nothing here animates beyond the dialog's own transition, so there is no
 * reduced-motion branch to get wrong.
 */

const ICONS: Record<SearchHit["kind"], LucideIcon> = {
  offer: LayoutGrid,
  client: UserRound,
  booking: CalendarClock,
};

/** Always available, so the palette is useful before anything is typed. */
const DESTINATIONS = [
  { key: "offers", href: "/dashboard/offers", icon: LayoutGrid, from: "nav" },
  { key: "bookings", href: "/dashboard/bookings", icon: CalendarClock, from: "nav" },
  // Clients are a tab of Bookings, and their label lives there rather than in
  // the nav namespace.
  { key: "clients", href: "/dashboard/bookings/clients", icon: UserRound, from: "tabs" },
  { key: "settings", href: "/dashboard/settings", icon: Settings, from: "nav" },
] as const;

export function CommandPalette() {
  const t = useTranslations("dashboard.palette");
  const tNav = useTranslations("dashboard.nav");
  const tTabs = useTranslations("dashboard.bookings.tabs");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [searching, startSearch] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  /* ---- Opening ---------------------------------------------------------- */

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- Searching -------------------------------------------------------- */

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();

    // Debounced: a query per keystroke would be a request per keystroke. A
    // query too short to search still goes through the timer so the previous
    // results are cleared on the same path — and so nothing calls setState
    // straight from the effect body.
    const timer = setTimeout(
      () => {
        startSearch(async () => {
          setHits(trimmed.length < 2 ? [] : await searchDashboard(trimmed));
          setCursor(0);
        });
      },
      trimmed.length < 2 ? 0 : 220,
    );

    return () => clearTimeout(timer);
  }, [query, open]);

  /** Closing forgets everything: the next Cmd+K starts from a clean field. */
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setHits([]);
      setCursor(0);
    }
  }

  /* ---- Choosing --------------------------------------------------------- */

  const shown: {
    key: string;
    icon: LucideIcon;
    title: string;
    subtitle: string | null;
    href: string;
  }[] =
    query.trim().length < 2
      ? DESTINATIONS.map((destination) => ({
          key: destination.key,
          icon: destination.icon,
          title:
            destination.from === "tabs"
              ? tTabs(destination.key as "clients")
              : tNav(destination.key as "offers"),
          subtitle: null,
          href: destination.href,
        }))
      : hits.map((hit) => ({
          key: `${hit.kind}-${hit.id}`,
          icon: ICONS[hit.kind],
          title: hit.title,
          subtitle: hit.subtitle,
          href: hit.href,
        }));

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setCursor((index) => (index + delta + shown.length) % shown.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const target = shown[cursor];
      if (target) go(target.href);
    }
  }

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelectorAll<HTMLElement>("[data-row]")
      [cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const empty = query.trim().length >= 2 && !searching && shown.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className="border-line bg-surface fixed top-[12vh] left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-float)]"
        >
          <VisuallyHidden.Root>
            <Dialog.Title>{t("title")}</Dialog.Title>
            <Dialog.Description>{t("hint")}</Dialog.Description>
          </VisuallyHidden.Root>

          <div className="border-line flex items-center gap-3 border-b px-4">
            {searching ? (
              <Loader2 className="text-ink-subtle size-4 shrink-0 animate-spin" />
            ) : (
              <Search className="text-ink-subtle size-4 shrink-0" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("title")}
              className="text-ink placeholder:text-ink-subtle h-13 w-full bg-transparent text-[15px] focus:outline-none"
            />
          </div>

          <div ref={listRef} className="max-h-[20rem] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="text-ink-subtle px-2 pt-1 pb-2 text-[11.5px] font-medium tracking-wide uppercase">
                {t("jumpTo")}
              </p>
            ) : null}

            {empty ? (
              <p className="text-ink-muted px-3 py-8 text-center text-[13.5px]">
                {t("none", { query: query.trim() })}
              </p>
            ) : null}

            {shown.map((row, index) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.key}
                  data-row
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => go(row.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors",
                    index === cursor ? "bg-ink/[0.05]" : "hover:bg-ink/[0.03]",
                  )}
                >
                  <Icon className="text-ink-subtle size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-[14px] font-medium">
                      {row.title}
                    </span>
                    {row.subtitle ? (
                      <span className="text-ink-muted block truncate text-[12.5px]">
                        {row.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-line text-ink-subtle flex items-center justify-between border-t px-4 py-2 text-[11.5px]">
            <span>{t("hint")}</span>
            <kbd className="border-line bg-canvas rounded border px-1.5 py-0.5 font-sans">esc</kbd>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
