import { getLocale, getTranslations } from "next-intl/server";

import { ManageBillingButton, SubscribeButton } from "@/components/dashboard/subscribe-button";
import { Card, CardHeader } from "@/components/ui/primitives";
import { paddleConfigured, paddleEnv } from "@/lib/billing/paddle";
import { PLAN_PRICE_MONTHLY } from "@/lib/plans/config";
import type { Tables } from "@/lib/supabase/database.types";

type BillingProfile = Pick<
  Tables<"profiles">,
  | "trial_ends_at"
  | "subscription_active"
  | "subscription_status"
  | "subscription_renews_at"
  | "paddle_customer_id"
>;

const DAY = 86_400_000;

/** Days of the platform's own free trial left; 0 once it is over. */
export function trialDaysLeft(trialEndsAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / DAY));
}

/**
 * Settings › Subscription: where the coach stands, and the one action that
 * matters from there — subscribe, or manage an existing subscription through
 * Paddle's portal. Every state is a sentence, not a status code.
 */
export async function SubscriptionCard({ profile, now }: { profile: BillingProfile; now: Date }) {
  const t = await getTranslations("dashboard.billing");
  const locale = await getLocale();
  const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(value)) : "—";

  const configured = paddleConfigured();
  const status = profile.subscription_status;
  const daysLeft = trialDaysLeft(profile.trial_ends_at, now);

  let title: string;
  let body: string;
  if (status === "trialing") {
    title = t("state.trialing");
    body = t("state.trialingBody", {
      date: date(profile.subscription_renews_at),
      price: PLAN_PRICE_MONTHLY,
    });
  } else if (status === "active") {
    title = t("state.active");
    body = t("state.activeBody", {
      date: date(profile.subscription_renews_at),
      price: PLAN_PRICE_MONTHLY,
    });
  } else if (status === "past_due") {
    title = t("state.pastDue");
    body = t("state.pastDueBody");
  } else if (status === "paused" || status === "canceled") {
    title = t("state.canceled");
    body = t("state.canceledBody");
  } else if (profile.subscription_active) {
    title = t("state.manual");
    body = t("state.manualBody");
  } else if (daysLeft > 0) {
    title = t("state.freeTrial", { count: daysLeft });
    body = t("state.freeTrialBody", {
      date: date(profile.trial_ends_at),
      price: PLAN_PRICE_MONTHLY,
    });
  } else {
    title = t("state.trialOver");
    body = t("state.trialOverBody", { price: PLAN_PRICE_MONTHLY });
  }

  const subscribed = status === "trialing" || status === "active" || status === "past_due";
  const canSubscribe = configured && !subscribed && !(profile.subscription_active && !status);

  return (
    <Card className="mb-6 p-5 sm:p-7">
      <CardHeader title={t("title")} description={t("hint")} />
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-ink text-[15px] font-semibold">{title}</p>
          <p className="text-ink-muted mt-1 max-w-lg text-[13.5px] leading-relaxed">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canSubscribe ? (
            <SubscribeButton
              environment={paddleEnv.environment}
              clientToken={paddleEnv.clientToken}
              locale={locale}
              label={t("subscribe", { price: PLAN_PRICE_MONTHLY })}
            />
          ) : null}
          {configured && profile.paddle_customer_id && status ? (
            <ManageBillingButton label={t("manage")} />
          ) : null}
        </div>
      </div>
      {!configured ? (
        <p className="text-ink-subtle mt-4 text-[12.5px]">{t("unavailable")}</p>
      ) : null}
    </Card>
  );
}
