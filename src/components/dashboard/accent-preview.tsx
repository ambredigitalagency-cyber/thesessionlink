"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/primitives";
import type { ThemeAccent } from "@/lib/validation";

/**
 * Miniature of the public offer card, so the pro sees what an accent actually
 * does before saving. It carries its own `data-accent`, which is what makes it
 * follow the pills live.
 *
 * Deliberately a mock rather than the real OfferCard: the editor has the
 * profile but not its offers, and this only has to show the accented surfaces —
 * badge, price, call to action.
 */
export function AccentPreview({
  accent,
  displayName,
  categoryName,
}: {
  accent: ThemeAccent;
  displayName: string;
  categoryName: string | null;
}) {
  const t = useTranslations("dashboard.profile");

  return (
    <div
      data-accent={accent}
      className="border-line bg-canvas rounded-[var(--radius-md)] border p-4"
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-ink/10 text-ink-muted flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
          {initials(displayName)}
        </span>
        <div className="min-w-0">
          <p className="text-ink truncate text-[13.5px] font-medium">{displayName}</p>
          {categoryName ? (
            <div className="mt-0.5">
              <Badge tone="accent">{categoryName}</Badge>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-line bg-surface mt-3 rounded-[var(--radius-sm)] border p-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-ink text-[13.5px] font-medium">{t("previewOffer")}</p>
          <p className="text-ink text-[13.5px] font-semibold">60 €</p>
        </div>

        <div className="mt-3 flex justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)]">
            {t("previewCta")}
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </div>

      <div className="mt-3 h-9 rounded-full bg-[var(--accent)]" aria-hidden="true" />
    </div>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
