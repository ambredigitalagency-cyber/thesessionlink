"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";

import type { Addon } from "@/lib/offers/addons";
import { cn } from "@/lib/utils";

/**
 * The extras on the booking form: one card per add-on, ticked with a tap,
 * and the running total underneath — which rolls to its new figure when a
 * card is ticked, so the client sees what the tick costs as they make it.
 */
export function AddonsPicker({
  addons,
  selected,
  onToggle,
  basePrice,
  quantity = 1,
  currency,
  locale,
}: {
  addons: Addon[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** The offer's own price per unit, when it has a firm one. */
  basePrice: number | null;
  quantity?: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("publicProfile.booking.addons");
  const money = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
  });
  const extras = addons
    .filter((addon) => selected.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  const total = basePrice === null ? null : basePrice * quantity + extras;

  return (
    <fieldset className="space-y-2">
      <legend className="text-ink mb-2 text-[13px] font-medium">{t("title")}</legend>
      <div className="grid gap-2">
        {addons.map((addon) => {
          const on = selected.includes(addon.id);
          return (
            <button
              key={addon.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(addon.id)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] border px-3.5 py-3 text-left",
                "transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.985]",
                on
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-line-strong bg-surface hover:border-ink/25",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors duration-200",
                  on
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-on)]"
                    : "border-line-strong",
                )}
              >
                <Check
                  className={cn(
                    "size-3.5 motion-safe:transition-transform motion-safe:duration-200",
                    on ? "scale-100" : "scale-0",
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-[14px] font-medium">{addon.label}</span>
                {addon.description ? (
                  <span className="text-ink-muted block text-[12.5px]">{addon.description}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[13.5px] font-semibold tabular-nums",
                  on ? "text-[var(--accent-ink)]" : "text-ink-muted",
                )}
              >
                +{money.format(addon.price)}
              </span>
            </button>
          );
        })}
      </div>

      {total !== null ? (
        <p className="text-ink-muted flex items-baseline justify-between pt-1 text-[13px]">
          {t("total")}
          <span className="text-ink relative inline-flex overflow-hidden text-[16px] font-semibold tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {money.format(total)}
              </motion.span>
            </AnimatePresence>
          </span>
        </p>
      ) : null}
    </fieldset>
  );
}
