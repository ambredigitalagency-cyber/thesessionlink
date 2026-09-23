"use client";

import { CalendarDays, ChartNoAxesColumn, LayoutGrid, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard/profile", key: "profile", icon: UserRound },
  { href: "/dashboard/offers", key: "offers", icon: LayoutGrid },
  { href: "/dashboard/bookings", key: "bookings", icon: CalendarDays },
  { href: "/dashboard/stats", key: "stats", icon: ChartNoAxesColumn },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebarNav({ pendingCount }: { pendingCount: number }) {
  const t = useTranslations("dashboard.nav");
  const isActive = useActive();

  return (
    <nav className="space-y-1">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] font-medium transition-colors",
              active ? "text-ink" : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId="dashboard-nav-active"
                className="bg-ink/[0.06] absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="relative size-4" />
            <span className="relative">{t(key)}</span>
            {key === "bookings" && pendingCount > 0 ? (
              <span className="relative ml-auto flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardTabBar({ pendingCount }: { pendingCount: number }) {
  const t = useTranslations("dashboard.nav");
  const isActive = useActive();

  return (
    <nav className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="flex">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-ink" : "text-ink-subtle",
              )}
            >
              <span className="relative">
                <Icon className="size-5" />
                {key === "bookings" && pendingCount > 0 ? (
                  <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-[var(--accent)]" />
                ) : null}
              </span>
              {t(key)}
              {active ? (
                <motion.span
                  layoutId="dashboard-tab-active"
                  className="bg-ink absolute inset-x-5 top-0 h-0.5 rounded-full"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
