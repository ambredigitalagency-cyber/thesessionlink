"use client";

import { CalendarRange, Clock, Plane, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { addTimeOff, deleteTimeOff } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { TimeRangeSlider } from "@/components/ui/slider";
import { notify } from "@/lib/notify";
import { isTimed } from "@/lib/scheduling/time-off";
import { cn } from "@/lib/utils";

export type CalendarTimeOff = {
  id: string;
  starts_on: string;
  ends_on: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

/** "14:00:00" → "14:00"; the slider's "23:59" is midnight. */
export function clock(value: string) {
  const short = value.slice(0, 5);
  return short === "23:59" ? "24:00" : short;
}

function useDayFormat(locale: string) {
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  return (key: string) =>
    new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${key}T12:00:00Z`),
    );
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
}

/** Adds a block and refreshes the calendar; `done` runs only once it is saved. */
function useBlockActions() {
  const t = useTranslations("dashboard.bookings.block");
  const tError = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(input: Parameters<typeof addTimeOff>[0], done?: () => void) {
    startTransition(async () => {
      const result = await addTimeOff(input);
      if (result.ok) {
        notify.success(t("blocked"));
        done?.();
        router.refresh();
      } else {
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTimeOff(id);
      if (result.ok) {
        notify.success(t("unblocked"));
        router.refresh();
      } else {
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  return { add, remove, pending };
}

/**
 * The confirmation that follows a drag across days (or two taps in "several
 * days" mode): the range in words, an optional reason, one button.
 */
export function RangeConfirm({
  from,
  to,
  locale,
  onDone,
}: {
  from: string;
  to: string;
  locale: string;
  onDone: () => void;
}) {
  const t = useTranslations("dashboard.bookings.block");
  const tCommon = useTranslations("common");
  const day = useDayFormat(locale);
  const { add, pending } = useBlockActions();
  const [label, setLabel] = useState("");

  return (
    <div
      role="dialog"
      aria-label={t("rangeTitle", { from: day(from), to: day(to) })}
      className="rise-in border-line-strong bg-surface rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-float)]"
    >
      <p className="text-ink flex items-center gap-2 text-[14.5px] font-semibold">
        <CalendarRange className="size-4 text-[var(--accent)]" aria-hidden />
        {from === to
          ? t("dayTitle", { day: day(from) })
          : t("rangeTitle", { from: day(from), to: day(to) })}
        <span className="text-ink-muted text-[13px] font-normal">
          · {t("rangeDays", { count: daysBetween(from, to) })}
        </span>
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t("labelPlaceholder")}
          maxLength={80}
          aria-label={t("labelAria")}
          className="sm:flex-1"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              add({ starts_on: from, ends_on: to, label: label.trim() || null }, onDone)
            }
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * What can be done with the selected day: block it whole, block some hours of
 * it on a slider, start a multi-day range, or lift what is already there.
 */
export function DayBlockPanel({
  day,
  isPast,
  blocks,
  locale,
  onPickRange,
  picking,
}: {
  day: string;
  isPast: boolean;
  /** Every block touching this day, whole-day and timed. */
  blocks: CalendarTimeOff[];
  locale: string;
  onPickRange: () => void;
  picking: boolean;
}) {
  const t = useTranslations("dashboard.bookings.block");
  const tCommon = useTranslations("common");
  const format = useDayFormat(locale);
  const { add, remove, pending } = useBlockActions();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [range, setRange] = useState({ start: "12:00", end: "14:00" });
  const [label, setLabel] = useState("");

  const whole = blocks.find((block) => !isTimed(block));
  const timed = blocks
    .filter(isTimed)
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  return (
    <div className="space-y-3">
      {whole ? (
        <div className="bg-surface border-line relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border px-3.5 py-3">
          <span aria-hidden className="blocked-hatch absolute inset-0" />
          <Plane className="text-ink-muted relative size-4 shrink-0" aria-hidden />
          <div className="relative min-w-0 flex-1">
            <p className="text-ink text-[14px] font-medium">
              {whole.starts_on === whole.ends_on
                ? t("dayBlocked")
                : t("rangeBlocked", { from: format(whole.starts_on), to: format(whole.ends_on) })}
            </p>
            {whole.label ? (
              <p className="text-ink-muted truncate text-[12.5px]">{whole.label}</p>
            ) : null}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="relative"
            loading={pending}
            onClick={() => remove(whole.id)}
          >
            {t("unblock")}
          </Button>
        </div>
      ) : null}

      {timed.length > 0 ? (
        <ul className="space-y-2">
          {timed.map((block) => (
            <li
              key={block.id}
              className="border-line bg-surface relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border px-3.5 py-2.5"
            >
              <span aria-hidden className="blocked-hatch absolute inset-y-0 left-0 w-1.5" />
              <Clock className="text-ink-muted size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-ink text-[14px] font-medium tabular-nums">
                  {t("hoursBlocked", {
                    from: clock(block.start_time!),
                    to: clock(block.end_time!),
                  })}
                  {block.starts_on !== block.ends_on ? (
                    <span className="text-ink-muted font-normal">
                      {" "}
                      · {format(block.starts_on)} → {format(block.ends_on)}
                    </span>
                  ) : null}
                </p>
                {block.label ? (
                  <p className="text-ink-muted truncate text-[12.5px]">{block.label}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(block.id)}
                className="text-ink-subtle hover:bg-danger-soft hover:text-danger rounded-full p-1.5 transition-colors"
                aria-label={t("unblockHours", {
                  from: clock(block.start_time!),
                  to: clock(block.end_time!),
                })}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {isPast || whole ? null : hoursOpen ? (
        <div className="rise-in border-line-strong bg-surface space-y-4 rounded-[var(--radius-md)] border p-4">
          <TimeRangeSlider
            label={t("hoursLabel")}
            start={range.start}
            end={range.end}
            onChange={setRange}
            step={15}
          />
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("labelPlaceholder")}
            maxLength={80}
            aria-label={t("labelAria")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setHoursOpen(false)} disabled={pending}>
              {tCommon("cancel")}
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                add(
                  {
                    starts_on: day,
                    ends_on: day,
                    start_time: range.start,
                    end_time: range.end,
                    label: label.trim() || null,
                  },
                  () => {
                    setHoursOpen(false);
                    setLabel("");
                  },
                )
              }
            >
              {t("hoursConfirm")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() => add({ starts_on: day, ends_on: day })}
          >
            <Plane className="size-3.5" />
            {t("blockDay")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setHoursOpen(true)}>
            <Clock className="size-3.5" />
            {t("blockHours")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={picking}
            onClick={onPickRange}
            className={cn(picking && "bg-[var(--accent-soft)] text-[var(--accent-ink)]")}
          >
            <CalendarRange className="size-3.5" />
            {picking ? t("pickEnd") : t("blockSeveral")}
          </Button>
        </div>
      )}
    </div>
  );
}
