import { getTranslations } from "next-intl/server";

import { summarizeTrial, type TrialFigures } from "@/lib/billing/trial-summary";

export type { TrialFigures };

/**
 * What the page brought during the trial, from trial_summary(): three real
 * figures, or — when nothing came in — one plain sentence, never a row of
 * zeros.
 */
export async function TrialSummary({ figures }: { figures: TrialFigures | null }) {
  const t = await getTranslations("dashboard.paywall.summary");
  const summary = summarizeTrial(figures);

  if (summary.kind === "empty") {
    return (
      <p className="border-line bg-surface text-ink-muted rounded-[var(--radius-md)] border p-5 text-center text-[14.5px] leading-relaxed">
        {t("empty")}
      </p>
    );
  }

  return (
    <section aria-labelledby="summary-title">
      <h2
        id="summary-title"
        className="text-ink-subtle text-center text-[12px] font-medium tracking-[0.08em] uppercase"
      >
        {t("title")}
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-2.5">
        {(["views", "clicks", "contacts"] as const).map((key) => (
          <div
            key={key}
            className="border-line bg-surface flex flex-col-reverse rounded-[var(--radius-md)] border p-4 text-center"
          >
            <dt className="text-ink-muted mt-0.5 text-[12.5px]">
              {summary[key] === 1 ? t(`${key}One`) : t(key)}
            </dt>
            <dd className="text-ink text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
              {summary[key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
