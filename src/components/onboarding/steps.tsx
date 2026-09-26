"use client";

import { useTranslations } from "next-intl";

import { StepProgress } from "@/components/ui/step-progress";

const STEPS = [1, 2, 3] as const;

/**
 * Account, profile, then the dashboard. The first offer is no longer a step:
 * the dashboard invites to it, it does not gate on it.
 */
export function OnboardingSteps({
  current,
  advance,
  className,
}: {
  current: 1 | 2 | 3;
  /** Progress inside the current step, for steps walked in several phases. */
  advance?: number;
  className?: string;
}) {
  const t = useTranslations("onboarding.steps");

  // Pas de marge par défaut : le parent espace ses enfants, et en Tailwind v4
  // `space-y-*` pose sa marge à travers `:where()`, de spécificité nulle —
  // n'importe quel `mb-*` posé ici la ferait sauter en silence.
  return (
    <nav aria-label={t("aria")} className={className}>
      <StepProgress
        label={t("aria")}
        steps={STEPS.map((step) => t(`${step}` as "1"))}
        current={current - 1}
        advance={advance}
      />
    </nav>
  );
}
