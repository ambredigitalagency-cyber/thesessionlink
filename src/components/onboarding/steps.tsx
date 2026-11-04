"use client";

import { useTranslations } from "next-intl";

import { StepProgress } from "@/components/ui/step-progress";
import { SCREENS, type Screen } from "@/lib/onboarding/steps";

/**
 * The trade, the name and link, the main button, the look. The page goes
 * live at the end of the third; the fourth only dresses it.
 */
export function OnboardingSteps({
  current,
  advance,
  className,
}: {
  current: Screen;
  /** Progress inside the current step, 0–1. */
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
        steps={SCREENS.map((screen) => t(screen))}
        current={SCREENS.indexOf(current)}
        advance={advance}
      />
    </nav>
  );
}
