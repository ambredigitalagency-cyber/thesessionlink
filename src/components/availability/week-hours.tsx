"use client";

import { CopyPlus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { DayGlyph } from "@/components/availability/day-glyph";
import { ChoiceToggleGroup } from "@/components/ui/choice-cards";
import { TimeRangeSlider } from "@/components/ui/slider";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { WEEKDAY_ORDER, weekdayLabel } from "@/lib/offers/meta";
import {
  compactRange,
  copyToOpenDays,
  isOpen,
  nextRange,
  openingRanges,
  type DayRange,
  type WeekHours,
} from "@/lib/scheduling/weekly";

/**
 * The week, set by pointing: which days you open, then when.
 *
 * The days are cards — the offer builder's cards, switched on and off — each
 * with its own drawing of the hours it holds, so the shape of the week is
 * readable before anything is touched. Under them, one zone holds a two-thumb
 * slider per open day, 15-minute steps, the range written out live while it
 * moves. Nothing is typed.
 *
 * Controlled and side-effect free apart from a toast: the onboarding screen
 * and Dashboard › Availability each decide when to save.
 */
export function WeekHoursEditor({
  week,
  onChange,
  locale,
}: {
  week: WeekHours;
  onChange: (week: WeekHours) => void;
  locale: string;
}) {
  const t = useTranslations("dashboard.availability");
  const tCommon = useTranslations("common");

  const openDays = WEEKDAY_ORDER.filter((weekday) => isOpen(week, weekday));

  function setDay(weekday: number, ranges: DayRange[]) {
    onChange({ ...week, [weekday]: ranges });
  }

  function toggle(weekday: number) {
    setDay(weekday, isOpen(week, weekday) ? [] : openingRanges(week, WEEKDAY_ORDER));
  }

  function copyFrom(weekday: number) {
    onChange(copyToOpenDays(week, weekday));
    notify.success(t("copiedToOpen"));
  }

  return (
    <div className="space-y-4">
      <ChoiceToggleGroup
        label={t("daysLabel")}
        columns={7}
        compact
        values={openDays.map(String)}
        onToggle={(value) => toggle(Number(value))}
        options={WEEKDAY_ORDER.map((weekday) => {
          const ranges = week[weekday] ?? [];
          return {
            value: String(weekday),
            title: (
              <>
                <span className="sr-only">{weekdayLabel(weekday, locale, "long")}</span>
                <span aria-hidden className="capitalize">
                  {weekdayLabel(weekday, locale, "short")}
                </span>
              </>
            ),
            description: (
              // One line per range: a split day reads as two short lines, not
              // a sentence broken at every dash.
              <span className="tabular-nums">
                {ranges.length > 0
                  ? ranges.map((range, index) => {
                      const text = compactRange(range);
                      return (
                        <span
                          key={index}
                          className={cn(
                            "block whitespace-nowrap",
                            // "10:45–15:30" must fit a seventh of the row.
                            text.includes(":") && "text-[11px] tracking-[-0.01em]",
                          )}
                        >
                          {text}
                        </span>
                      );
                    })
                  : t("closed")}
              </span>
            ),
            visual: <DayGlyph ranges={ranges} className="w-full max-w-[64px]" />,
          };
        })}
      />

      {openDays.length > 0 ? (
        <div className="border-line bg-surface divide-line divide-y rounded-[var(--radius-md)] border">
          {openDays.map((weekday, index) => {
            const ranges = week[weekday] ?? [];
            const name = weekdayLabel(weekday, locale, "long");

            return (
              <div
                key={weekday}
                style={{ "--rise-delay": `${Math.min(index, 6) * 0.03}s` } as CSSProperties}
                className="rise-in flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
              >
                <p className="text-ink flex items-center gap-2 text-[14px] font-medium capitalize sm:w-28 sm:pt-0.5">
                  <span aria-hidden className="size-2 rounded-full bg-[var(--accent)]" />
                  {name}
                </p>

                <div className="min-w-0 flex-1 space-y-4">
                  {ranges.map((range, position) => (
                    <div
                      key={position}
                      className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
                    >
                      <TimeRangeSlider
                        label={name}
                        start={range.start}
                        end={range.end}
                        onChange={(next) =>
                          setDay(
                            weekday,
                            ranges.map((item, at) => (at === position ? next : item)),
                          )
                        }
                        className="min-w-0 sm:flex-1"
                      />
                      {/* On a phone the buttons go under the track, so the track
                          gets the whole width a thumb needs. From sm up they sit
                          beside it at a fixed width, buttons from the right:
                          every track of the week ends at the same x. */}
                      <div className="-mr-2 flex items-center justify-end sm:mr-0 sm:w-[84px] sm:shrink-0">
                        {ranges.length > 1 ? (
                          <IconButton
                            label={tCommon("remove")}
                            onClick={() =>
                              setDay(
                                weekday,
                                ranges.filter((_, at) => at !== position),
                              )
                            }
                          >
                            <X className="size-3.5" />
                          </IconButton>
                        ) : null}

                        {position === ranges.length - 1 ? (
                          <>
                            <IconButton
                              label={t("addRange")}
                              onClick={() => setDay(weekday, [...ranges, nextRange(ranges)])}
                            >
                              <Plus className="size-3.5" />
                            </IconButton>
                            {openDays.length > 1 ? (
                              <IconButton label={t("copyToOpen")} onClick={() => copyFrom(weekday)}>
                                <CopyPlus className="size-3.5" />
                              </IconButton>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rise-in border-line-strong text-ink-muted rounded-[var(--radius-md)] border border-dashed p-5 text-center text-[13.5px]">
          {t("noDays")}
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      // A finger-sized target on a phone, the compact icon from sm up.
      className="text-ink-subtle hover:bg-ink/5 hover:text-ink flex size-10 items-center justify-center rounded-full transition-colors sm:size-auto sm:p-1.5"
    >
      {children}
    </button>
  );
}
