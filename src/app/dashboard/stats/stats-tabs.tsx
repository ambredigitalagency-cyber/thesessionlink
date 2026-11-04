"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/stats", key: "overview" },
  { href: "/dashboard/stats/links", key: "links" },
] as const;

/** Overview and tracking links: two views of the same question. */
export function StatsTabs() {
  const t = useTranslations("stats.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="bg-ink/[0.04] mb-6 inline-flex gap-1 rounded-full p-1">
      {TABS.map(({ href, key }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId="stats-tab"
                className="bg-surface absolute inset-0 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.08)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
