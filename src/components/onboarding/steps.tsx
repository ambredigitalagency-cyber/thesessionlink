"use client";

import { useTranslations } from "next-intl";

import { StepProgress } from "@/components/ui/step-progress";

const STEPS = [1, 2, 3, 4] as const;

/** Four steps, no exit until the first offer exists. */
export function OnboardingSteps({
  current,
  advance,
  className,
}: {
  current: 1 | 2 | 3 | 4;
  /** Progress inside the current step, for steps walked in several phases. */
  advance?: number;
  className?: string;
}) {
  const t = useTranslations("onboarding.steps");

  return (
    <nav aria-label={t("aria")} className={className ?? "mb-8"}>
      <StepProgress
        label={t("aria")}
        steps={STEPS.map((step) => t(`${step}` as "1"))}
        current={current - 1}
        advance={advance}
      />
    </nav>
  );
}
