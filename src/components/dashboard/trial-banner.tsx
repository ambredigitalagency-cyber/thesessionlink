import { getLocale, getTranslations } from "next-intl/server";

import { SubscribeButton } from "@/components/dashboard/subscribe-button";
import { trialDaysLeft } from "@/components/dashboard/subscription-card";
import { accessState } from "@/lib/billing/access";
import { paddleConfigured, paddleEnv } from "@/lib/billing/paddle";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import type { Tables } from "@/lib/supabase/database.types";

/** Shown this many days before the end of the free trial. */
const WARN_DAYS = 3;

/**
 * A thin line above every dashboard page in the last days of the free trial,
 * with the button right there, so subscribing is one tap from wherever the
 * coach is. Silent otherwise — and once the trial is over the dashboard itself
 * gives way to the subscription screen (Paywall), so there is no "ended"
 * banner any more.
 */
export async function TrialBanner({
  profile,
  now,
}: {
  profile: Pick<
    Tables<"profiles">,
    "trial_ends_at" | "subscription_active" | "subscription_status" | "subscription_ended_at"
  >;
  now: Date;
}) {
  if (!paddleConfigured() || accessState(profile, now) !== "trial") return null;
  const daysLeft = trialDaysLeft(profile.trial_ends_at, now);
  if (daysLeft > WARN_DAYS) return null;

  const t = await getTranslations("dashboard.billing");
  const locale = await getLocale();

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning)]/35 bg-[var(--color-warning-soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-ink text-[14px]">
        {t("banner.ending", { count: daysLeft, price: PLAN_PRICE_MONTHLY })}
      </p>
      <SubscribeButton
        environment={paddleEnv.environment}
        clientToken={paddleEnv.clientToken}
        locale={locale}
        label={t("subscribe", { price: PLAN_PRICE_MONTHLY })}
        size="sm"
      />
    </div>
  );
}
