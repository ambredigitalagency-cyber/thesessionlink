"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { ACTION_ICONS } from "@/lib/offers/meta";
import { ACTION_TYPES, type ActionType } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

/**
 * The five ways a client can act on an offer. Closed set on purpose: each one
 * maps to a different public flow and a different booking shape.
 */
export function ActionTypePicker({
  value,
  onChange,
  suggested,
}: {
  value: ActionType;
  onChange: (actionType: ActionType) => void;
  suggested?: ActionType | null;
}) {
  const t = useTranslations("offers.actions");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ACTION_TYPES.map((actionType) => {
        const Icon = ACTION_ICONS[actionType];
        const selected = value === actionType;

        return (
          <button
            key={actionType}
            type="button"
            onClick={() => onChange(actionType)}
            aria-pressed={selected}
            className={cn(
              "group relative flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-all duration-200",
              selected
                ? "border-ink bg-ink/[0.03] shadow-[0_0_0_1px_var(--color-ink)]"
                : "border-line-strong hover:border-ink/30 hover:bg-canvas",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                selected ? "bg-ink text-ink-inverse" : "bg-ink/5 text-ink-muted",
              )}
            >
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-ink text-[14px] font-medium">{t(`${actionType}.label`)}</span>
                {suggested === actionType && !selected ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--accent-ink)] uppercase">
                    {t("suggested")}
                  </span>
                ) : null}
              </span>
              <span className="text-ink-muted mt-0.5 block text-[12.5px] leading-snug">
                {t(`${actionType}.description`)}
              </span>
            </span>

            {selected ? (
              <motion.span
                layoutId="action-type-check"
                className="bg-ink text-ink-inverse mt-1 flex size-4 shrink-0 items-center justify-center rounded-full"
              >
                <Check className="size-3" />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
