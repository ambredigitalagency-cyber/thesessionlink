"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { CardStyle, ProfileLayout, ThemeAccent } from "@/lib/validation";

/**
 * Miniature of the public page — header and one offer card — so the pro sees
 * what an accent, a layout and a card style actually do before saving. It carries its own `data-accent`, which is what makes it
 * follow the pills live.
 *
 * Deliberately a mock rather than the real OfferCard: the editor has the
 * profile but not its offers, and this only has to show the accented surfaces —
 * badge, price, call to action.
 */
export function AccentPreview({
  accent,
  layout = "centered",
  cards = "outline",
  displayName,
  categoryName,
}: {
  accent: ThemeAccent;
  layout?: ProfileLayout;
  cards?: CardStyle;
  displayName: string;
  categoryName: string | null;
}) {
  const t = useTranslations("dashboard.profile");

  return (
    <div
      data-accent={accent}
      className="border-line bg-canvas relative overflow-hidden rounded-[var(--radius-md)] border p-4"
    >
      {layout === "banner" ? (
        <div aria-hidden className="absolute inset-x-0 top-0 h-9 bg-[var(--accent)]" />
      ) : null}
      <div
        className={cn(
          "relative flex gap-2.5",
          layout === "centered" ? "flex-col items-center text-center" : "items-center",
          layout === "banner" && "flex-col items-start pt-3",
        )}
      >
        <span
          className={cn(
            "bg-surface text-ink-muted ring-line flex size-8 items-center justify-center rounded-full text-[11px] font-semibold ring-1",
            layout === "banner" && "ring-2 ring-[var(--color-canvas)]",
          )}
        >
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

      <div
        className={cn(
          "mt-3 rounded-[var(--radius-sm)] border p-3",
          cards === "outline" && "border-line bg-surface",
          cards === "soft" && "bg-surface border-transparent shadow-[var(--shadow-float)]",
          cards === "accent" &&
            "border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[var(--accent-soft)]",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-ink text-[13.5px] font-medium">{t("previewOffer")}</p>
          <p className="text-ink text-[13.5px] font-semibold">60 €</p>
        </div>

        <div className="mt-3 flex justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-medium",
              cards === "accent"
                ? "bg-[var(--accent)] text-[var(--accent-on)]"
                : "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
            )}
          >
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
