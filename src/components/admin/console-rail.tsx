"use client";

import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The console's chrome.
 *
 * The header it replaces was three text links in a dark bar — enough to
 * navigate, not enough to say where you are. A rail says both: it is present
 * on every screen, it marks the current section, and it is structurally
 * unlike anything else in the product. The coach's dashboard has a light
 * sidebar on paper; the console has a dark rail. Nobody who has seen one will
 * mistake it for the other.
 *
 * On a phone the rail lies down and becomes a row along the top — same items,
 * same order, same marker — rather than a drawer that has to be opened to find
 * out where you are.
 */

const SECTIONS = [
  { href: "/admin", key: "coaches", icon: Users, exact: true },
  { href: "/admin/audit", key: "audit", icon: ClipboardList, exact: false },
] as const;

/**
 * `identity` is the member's email, or a plain label for the password door.
 * The link to "my dashboard" only exists for a member: the password door has
 * no coach account to go back to.
 */
export function ConsoleRail({
  identity,
  showDashboard,
}: {
  identity: string;
  showDashboard: boolean;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const active = (href: string, exact: boolean) =>
    exact ? pathname === href || pathname.startsWith("/admin/coaches") : pathname.startsWith(href);

  return (
    <div
      className={cn(
        "bg-[var(--console-rail)] text-[var(--console-rail-ink)]",
        // Phone: a bar across the top. Desktop: a column down the left.
        "sticky top-0 z-40 lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0",
        "flex flex-col",
      )}
    >
      {/* The product's own wordmark, then the space it opens onto. */}
      <Link
        href="/admin"
        className="flex items-center gap-2.5 px-4 py-3.5 lg:flex-col lg:items-start lg:gap-2 lg:px-5 lg:py-6"
      >
        <Logo tone="console" className="text-[16px]" />
        <ConsoleTag label={t("title")} />
      </Link>

      <nav aria-label={t("nav.aria")} className="px-2 pb-3 lg:px-3 lg:pb-0">
        <ul className="flex gap-1 lg:flex-col">
          {SECTIONS.map(({ href, key, icon: Icon, exact }) => {
            const current = active(href, exact);
            return (
              <li key={href} className="flex-1 lg:flex-none">
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13.5px] font-medium transition-[color,background-color,transform] motion-safe:active:scale-[0.98]",
                    "focus-visible:outline-offset-[-2px]",
                    current
                      ? "bg-[var(--console-rail-soft)] text-[var(--console-rail-ink)]"
                      : "text-[var(--console-rail-muted)] hover:bg-[var(--console-rail-soft)]/60 hover:text-[var(--console-rail-ink)]",
                  )}
                >
                  {/* The marker is a bar on the edge the rail runs along, so it
                      reads as "you are here" in both orientations. */}
                  {current ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--console-accent)] lg:inset-x-auto lg:inset-y-2 lg:-left-3 lg:h-auto lg:w-0.5"
                    />
                  ) : null}
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(`nav.${key}` as "nav.coaches")}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto hidden border-t border-[var(--console-rail-line)] px-3 py-4 lg:block">
        {showDashboard ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--console-rail-muted)] transition-colors hover:bg-[var(--console-rail-soft)]/60 hover:text-[var(--console-rail-ink)]"
          >
            <LayoutDashboard className="size-4 shrink-0" aria-hidden />
            {t("nav.myDashboard")}
          </Link>
        ) : null}
        <p
          className="truncate px-3 pt-3 text-[11.5px] text-[var(--console-rail-muted)]"
          title={identity}
        >
          {identity}
        </p>
      </div>
    </div>
  );
}

/**
 * What the rail carries on desktop but has no room for once it is a bar: the
 * way back to one's own dashboard, who is signed in, and the way out.
 */
export function ConsoleRailFooter({
  identity,
  showDashboard,
  signOut,
}: {
  identity: string;
  showDashboard: boolean;
  signOut: React.ReactNode;
}) {
  const t = useTranslations("admin");

  return (
    <div className="border-line text-ink-subtle flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-4 text-[12px] sm:px-6 lg:hidden">
      {showDashboard ? (
        <Link href="/dashboard" className="hover:text-ink inline-flex items-center gap-1.5">
          <LayoutDashboard className="size-3.5" aria-hidden />
          {t("nav.myDashboard")}
        </Link>
      ) : null}
      <span className="min-w-0 truncate">{identity}</span>
      <span className="ml-auto">{signOut}</span>
    </div>
  );
}

/** "Console", set small in steel beside the wordmark: same brand, other room. */
export function ConsoleTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-[var(--console-rail-accent)]/35 px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--console-rail-accent)] uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}
