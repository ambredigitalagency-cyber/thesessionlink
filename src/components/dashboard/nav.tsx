"use client";

import { ChartNoAxesColumn, LayoutGrid, PanelsTopLeft, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/** The places the dashboard goes, in the sidebar and the bottom bar alike. */
const ITEMS = [
  { href: "/dashboard/page", key: "page", icon: PanelsTopLeft },
  { href: "/dashboard/offers", key: "offers", icon: LayoutGrid },
  { href: "/dashboard/stats", key: "stats", icon: ChartNoAxesColumn },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebarNav() {
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
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The bottom bar, below the sidebar's breakpoint.
 *
 * It is drawn in ink and never in the coach's accent, like the rest of the
 * dashboard: the workspace should look the same whichever colour someone
 * picked for their public page.
 *
 * Three things make it navigable rather than merely tappable: `aria-current`
 * on the section you are in (the colour change alone says nothing to a screen
 * reader), a focus ring pulled inside the bar so it is not clipped by the
 * viewport edge, and a 56px-tall target, above the 44px floor, because a bar
 * pinned to the bottom of a phone is reached with a thumb.
 *
 * The padding is `env(safe-area-inset-bottom)` so the labels clear the home
 * indicator on an iPhone instead of sitting under it.
 */
export function DashboardTabBar() {
  const t = useTranslations("dashboard.nav");
  const isActive = useActive();

  return (
    <nav
      aria-label={t("barLabel")}
      className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="flex">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = isActive(href);

          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-offset-[-3px]",
                  active ? "text-ink" : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="w-full truncate text-center">{t(key)}</span>
                {active ? (
                  <motion.span
                    aria-hidden
                    layoutId="dashboard-tab-active"
                    className="bg-ink absolute inset-x-4 top-0 h-0.5 rounded-full"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
