"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/bookings", key: "list", exact: true },
  { href: "/dashboard/bookings/calendar", key: "calendar", exact: false },
  { href: "/dashboard/bookings/clients", key: "clients", exact: false },
  { href: "/dashboard/bookings/availability", key: "availability", exact: false },
] as const;

export function BookingsTabs() {
  const t = useTranslations("dashboard.bookings.tabs");
  const pathname = usePathname();

  return (
    <div className="-mx-4 flex scrollbar-none gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative rounded-full px-3.5 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors",
              active ? "text-ink-inverse" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId="bookings-tab"
                className="bg-ink absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative">{t(tab.key)}</span>
          </Link>
        );
      })}
    </div>
  );
}
