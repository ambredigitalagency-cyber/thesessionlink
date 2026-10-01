"use client";

import { useTranslations } from "next-intl";

import { StepProgress } from "@/components/ui/step-progress";

const STEPS = [1, 2, 3, 4] as const;

/**
 * Account, the link (activity, name, address), the first offer, then the page
 * itself — the finishing touches and the share screen. The offer sits right
 * after the link because it is what makes the page worth visiting; the
 * cosmetic profile comes once the page is live.
 */
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
