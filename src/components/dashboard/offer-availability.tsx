"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveWeeklySchedule } from "@/actions/availability";
import { Card, CardHeader, ToggleRow } from "@/components/ui/primitives";
import { WEEKDAY_ORDER, weekdayLabel } from "@/lib/offers/meta";

import { WeeklyScheduleEditor, type ScheduleRule } from "./weekly-schedule";

/**
 * Per-offer availability. By default an offer follows the profile schedule;
 * turning the switch on gives it its own hours (the rows with offer_id set).
 */
export function OfferAvailability({
  offerId,
  offerTitle,
  rules,
  locale,
}: {
  offerId: string;
  offerTitle: string;
  rules: ScheduleRule[];
  locale: string;
}) {
  const t = useTranslations("dashboard.availability");
  const tError = useTranslations("errors");
  const router = useRouter();

  const offerRules = rules.filter((rule) => rule.offer_id === offerId);
  const defaultRules = rules.filter((rule) => rule.offer_id === null);

  const [custom, setCustom] = useState(offerRules.length > 0);
  const [, startTransition] = useTransition();

  function toggleCustom(next: boolean) {
    setCustom(next);

    if (!next) {
      // Dropping the override puts the offer back on the profile schedule.
      startTransition(async () => {
        const result = await saveWeeklySchedule({ offer_id: offerId, rules: [] });
        if (result.ok) {
          toast.success(t("backToDefault"));
          router.refresh();
        } else {
          toast.error(tError(result.error as "unexpected"));
        }
      });
    }
  }

  const summary = WEEKDAY_ORDER.filter((weekday) =>
    defaultRules.some((rule) => rule.weekday === weekday),
  )
    .map((weekday) => weekdayLabel(weekday, locale, "short"))
    .join(", ");

  return (
    <Card className="mt-6 p-5 sm:p-7">
      <CardHeader title={t("offerTitle")} description={t("offerHint", { title: offerTitle })} />

      <div className="divide-line mt-3 divide-y">
        <ToggleRow
          title={t("customSchedule")}
          description={t("customScheduleHint")}
          checked={custom}
          onCheckedChange={toggleCustom}
        />
      </div>

      {custom ? (
        <div className="mt-5">
          <WeeklyScheduleEditor
            offerId={offerId}
            rules={offerRules}
            locale={locale}
            onSaved={() => router.refresh()}
          />
        </div>
      ) : (
        <div className="bg-ink/[0.03] mt-5 flex items-start gap-3 rounded-[var(--radius-md)] p-4">
          <CalendarClock className="text-ink-muted mt-0.5 size-4 shrink-0" />
          <div className="text-ink-muted text-[13.5px] leading-relaxed">
            <p>
              {summary ? t("defaultSummary", { days: summary }) : t("defaultEmpty")}{" "}
              <Link
                href="/dashboard/bookings/availability"
                className="text-ink font-medium underline underline-offset-4"
              >
                {t("editDefault")}
              </Link>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
