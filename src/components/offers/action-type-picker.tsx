"use client";

import { useTranslations } from "next-intl";

import { ACTION_GLYPHS } from "@/components/marketing/action-glyphs";
import { ChoiceGroup } from "@/components/ui/choice-cards";
import { ACTION_ICONS } from "@/lib/offers/meta";
import { ACTION_TYPES, type ActionType } from "@/lib/offers/schema";

/**
 * The five ways a client can act on an offer. Closed set on purpose: each one
 * maps to a different public flow and a different booking shape.
 *
 * `size="question"` is the version that owns a whole phase of the builder:
 * each card carries the animated drawing the landing page already uses for
 * that action — a slot being picked, a seat being taken, two bubbles meeting.
 * They were written for exactly this job and cost a few hundred bytes each,
 * and reusing them means the promise made on the landing and the choice made
 * in the product are literally the same picture.
 *
 * `size="row"` is the compact version, for the single-page editor where this
 * is one section among many and a five-card gallery would drown the rest.
 */
export function ActionTypePicker({
  value,
  onChange,
  suggested,
  size = "row",
}: {
  value: ActionType;
  onChange: (actionType: ActionType) => void;
  suggested?: ActionType | null;
  size?: "question" | "row";
}) {
  const t = useTranslations("offers.actions");
  const asQuestion = size === "question";

  return (
    <ChoiceGroup
      name="action-type"
      label={t("groupLabel")}
      value={value}
      onChange={onChange}
      layout={asQuestion ? "tile" : "row"}
      columns={2}
      visual={asQuestion ? "bare" : "bubble"}
      options={ACTION_TYPES.map((actionType) => {
        const Glyph = ACTION_GLYPHS[actionType];
        const Icon = ACTION_ICONS[actionType];

        return {
          value: actionType,
          title: t(`${actionType}.label`),
          description: t(`${actionType}.description`),
          visual: asQuestion ? (
            <Glyph className="w-full" />
          ) : (
            <Icon className="size-4" aria-hidden />
          ),
          badge:
            suggested === actionType && value !== actionType ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--accent-ink)] uppercase">
                {t("suggested")}
              </span>
            ) : undefined,
        };
      })}
    />
  );
}
