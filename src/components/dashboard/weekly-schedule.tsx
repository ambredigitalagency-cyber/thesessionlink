"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { saveWeeklySchedule } from "@/actions/availability";
import { WeekHoursEditor } from "@/components/availability/week-hours";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import {
  minutesOpen,
  toWeekHours,
  toWeeklyRules,
  weekProblem,
  type WeekHours,
} from "@/lib/scheduling/weekly";

export type ScheduleRule = {
  offer_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
};

/**
 * Dashboard › Availability, and an offer's own hours. The week is the same
 * editor as the onboarding screen — day cards, then a slider per open day —
 * with the weekly total and a save under it.
 */
export function WeeklyScheduleEditor({
  offerId,
  rules,
  locale,
  onSaved,
}: {
  offerId: string | null;
  rules: ScheduleRule[];
  locale: string;
  onSaved?: () => void;
}) {
  const t = useTranslations("dashboard.availability");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  // "37,3 h" in French, "37.3 h" in English.
  const format = useFormatter();

  const [week, setWeek] = useState<WeekHours>(() => toWeekHours(rules));
  const [pending, startTransition] = useTransition();

  function save() {
    const problem = weekProblem(week);
    if (problem) {
      notify.error(problem === "overlap" ? t("overlap") : tError("end_before_start"));
      return;
    }

    startTransition(async () => {
      const result = await saveWeeklySchedule({ offer_id: offerId, rules: toWeeklyRules(week) });
      if (result.ok) {
        notify.success(tCommon("saved"));
        onSaved?.();
      } else {
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <WeekHoursEditor week={week} onChange={setWeek} locale={locale} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-ink-muted text-[13px] tabular-nums" aria-live="polite">
          {t("weeklyTotal", {
            hours: format.number(minutesOpen(week) / 60, { maximumFractionDigits: 1 }),
          })}
        </p>
        <Button onClick={save} loading={pending}>
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
