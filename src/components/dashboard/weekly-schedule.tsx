"use client";

import { CopyPlus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveWeeklySchedule } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/primitives";
import { WEEKDAY_ORDER, weekdayLabel } from "@/lib/offers/meta";
import { cn } from "@/lib/utils";

export type ScheduleRule = {
  offer_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
};

type Range = { start: string; end: string };

const DEFAULT_RANGE: Range = { start: "09:00", end: "17:00" };

function toDayMap(rules: ScheduleRule[]): Record<number, Range[]> {
  const map: Record<number, Range[]> = {};
  for (const rule of rules) {
    const list = map[rule.weekday] ?? [];
    list.push({ start: rule.start_time.slice(0, 5), end: rule.end_time.slice(0, 5) });
    map[rule.weekday] = list.sort((a, b) => a.start.localeCompare(b.start));
  }
  return map;
}

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

  const [days, setDays] = useState<Record<number, Range[]>>(() => toDayMap(rules));
  const [pending, startTransition] = useTransition();

  function setDay(weekday: number, ranges: Range[]) {
    setDays((current) => ({ ...current, [weekday]: ranges }));
  }

  function copyToAll(weekday: number) {
    const source = days[weekday] ?? [];
    setDays(() => {
      const next: Record<number, Range[]> = {};
      for (const day of WEEKDAY_ORDER) {
        next[day] = source.map((range) => ({ ...range }));
      }
      return next;
    });
    toast.success(t("copied"));
  }

  function save() {
    const payload = Object.entries(days).flatMap(([weekday, ranges]) =>
      (ranges ?? []).map((range) => ({
        weekday: Number(weekday),
        start_time: `${range.start}:00`,
        end_time: `${range.end}:00`,
      })),
    );

    const invalid = payload.some((rule) => rule.end_time <= rule.start_time);
    if (invalid) {
      toast.error(tError("end_before_start"));
      return;
    }

    startTransition(async () => {
      const result = await saveWeeklySchedule({ offer_id: offerId, rules: payload });
      if (result.ok) {
        toast.success(tCommon("saved"));
        onSaved?.();
      } else {
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="divide-line divide-y">
        {WEEKDAY_ORDER.map((weekday) => {
          const ranges = days[weekday] ?? [];
          const enabled = ranges.length > 0;

          return (
            <div key={weekday} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start">
              <div className="flex w-full items-center gap-3 sm:w-44">
                <Toggle
                  checked={enabled}
                  label={weekdayLabel(weekday, locale, "long")}
                  onCheckedChange={(checked) =>
                    setDay(weekday, checked ? [{ ...DEFAULT_RANGE }] : [])
                  }
                />
                <span
                  className={cn(
                    "text-[14px] font-medium capitalize",
                    enabled ? "text-ink" : "text-ink-subtle",
                  )}
                >
                  {weekdayLabel(weekday, locale, "long")}
                </span>
              </div>

              <div className="flex-1 space-y-2">
                {enabled ? (
                  ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.start}
                        step={300}
                        onChange={(event) =>
                          setDay(
                            weekday,
                            ranges.map((item, position) =>
                              position === index ? { ...item, start: event.target.value } : item,
                            ),
                          )
                        }
                        className="border-line-strong bg-surface text-ink focus:border-ink h-10 rounded-[var(--radius-xs)] border px-2.5 text-[14px] focus:outline-none"
                      />
                      <span className="text-ink-subtle">–</span>
                      <input
                        type="time"
                        value={range.end}
                        step={300}
                        onChange={(event) =>
                          setDay(
                            weekday,
                            ranges.map((item, position) =>
                              position === index ? { ...item, end: event.target.value } : item,
                            ),
                          )
                        }
                        className="border-line-strong bg-surface text-ink focus:border-ink h-10 rounded-[var(--radius-xs)] border px-2.5 text-[14px] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDay(
                            weekday,
                            ranges.filter((_, position) => position !== index),
                          )
                        }
                        className="text-ink-subtle hover:bg-ink/5 hover:text-ink rounded-full p-1.5 transition-colors"
                        aria-label={tCommon("remove")}
                      >
                        <X className="size-3.5" />
                      </button>

                      {index === ranges.length - 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDay(weekday, [...ranges, { start: "18:00", end: "20:00" }])
                            }
                            className="text-ink-subtle hover:bg-ink/5 hover:text-ink rounded-full p-1.5 transition-colors"
                            aria-label={t("addRange")}
                          >
                            <Plus className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToAll(weekday)}
                            className="text-ink-subtle hover:bg-ink/5 hover:text-ink rounded-full p-1.5 transition-colors"
                            aria-label={t("copyToAll")}
                            title={t("copyToAll")}
                          >
                            <CopyPlus className="size-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-ink-subtle py-2.5 text-[13.5px]">{t("unavailable")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={pending}>
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
