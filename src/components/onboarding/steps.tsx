"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STEPS = [1, 2, 3, 4] as const;

/** Four steps, no exit until the first offer exists. */
export function OnboardingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("onboarding.steps");

  return (
    <nav aria-label={t("aria")} className="mb-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((step) => {
          const done = step < current;
          const active = step === current;

          return (
            <li key={step} className="flex flex-1 flex-col gap-2">
              <div className="bg-ink/10 relative h-1 overflow-hidden rounded-full">
                {done ? (
                  <div className="bg-ink absolute inset-0" />
                ) : active ? (
                  <motion.div
                    layoutId="onboarding-progress"
                    className="absolute inset-0 bg-[var(--accent)]"
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "flex items-center gap-1 text-[11.5px] font-medium",
                  active ? "text-ink" : done ? "text-ink-muted" : "text-ink-subtle",
                )}
              >
                {done ? <Check className="size-3" /> : null}
                <span className="hidden sm:inline">{t(`${step}` as "1")}</span>
                <span className="sm:hidden">{step}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
