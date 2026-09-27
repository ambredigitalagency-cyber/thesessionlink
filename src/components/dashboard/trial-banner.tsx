import { getLocale, getTranslations } from "next-intl/server";

import { SubscribeButton } from "@/components/dashboard/subscribe-button";
import { trialDaysLeft } from "@/components/dashboard/subscription-card";
import { paddleConfigured, paddleEnv } from "@/lib/billing/paddle";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import type { Tables } from "@/lib/supabase/database.types";

/** Shown this many days before the end of the free trial, and after it. */
const WARN_DAYS = 3;

/**
 * A thin line above every dashboard page when the free trial is about to end
 * or has ended and there is no subscription — with the button right there, so
 * subscribing is one tap from wherever the coach is. Silent otherwise.
 */
export async function TrialBanner({
  profile,
  now,
}: {
  profile: Pick<
    Tables<"profiles">,
    "trial_ends_at" | "subscription_active" | "subscription_status"
  >;
  now: Date;
}) {
  if (!paddleConfigured() || profile.subscription_active) return null;
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
        {daysLeft > 0
          ? t("banner.ending", { count: daysLeft, price: PLAN_PRICE_MONTHLY })
          : t("banner.ended", { price: PLAN_PRICE_MONTHLY })}
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
