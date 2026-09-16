"use client";

import { CalendarX2, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Slot = { start: string; end: string };

type SlotResponse = {
  timezone: string;
  durationMinutes: number;
  slots: Slot[];
};

function visitorTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Groups slots by calendar day in the visitor's own timezone. */
function groupByDay(slots: Slot[], timezone: string, locale: string) {
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "numeric",
    timeZone: timezone,
  });
  const dayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });

  const groups = new Map<string, { label: string; slots: Slot[] }>();

  for (const slot of slots) {
    const date = new Date(slot.start);
    const key = dayKey.format(date);
    const group = groups.get(key) ?? { label: dayLabel.format(date), slots: [] };
    group.slots.push(slot);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
}

export function SlotPicker({
  offerId,
  locale,
  selected,
  onSelect,
}: {
  offerId: string;
  locale: string;
  selected: string | null;
  onSelect: (start: string | null) => void;
}) {
  const t = useTranslations("publicProfile.booking");
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const [data, setData] = useState<SlotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** Day the visitor tapped; the first day with slots is used until then. */
  const [preferredDay, setPreferredDay] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(4);

  const timezone = useMemo(() => visitorTimezone(), []);

  useEffect(() => {
    let cancelled = false;

    const from = new Date();
    const to = new Date(Date.now() + weeks * 7 * 86_400_000);

    fetch(`/api/slots?offer=${offerId}&from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((payload: SlotResponse) => {
        if (cancelled) return;
        setData(payload);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [offerId, weeks]);

  const days = useMemo(
    () => (data ? groupByDay(data.slots, timezone, tag) : []),
    [data, timezone, tag],
  );

  if (loading) {
    return (
      <div className="text-ink-muted flex items-center justify-center gap-2 py-10 text-[14px]">
        <Loader2 className="size-4 animate-spin" />
        {t("loadingSlots")}
      </div>
    );
  }

  if (error) {
    return <p className="text-ink-muted py-8 text-center text-[14px]">{t("slotsError")}</p>;
  }

  if (days.length === 0) {
    return (
      <div className="border-line-strong flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed px-5 py-10 text-center">
        <CalendarX2 className="text-ink-subtle size-5" />
        <p className="text-ink text-[14px] font-medium">{t("noSlots")}</p>
        <p className="text-ink-muted max-w-xs text-[13px]">{t("noSlotsHint")}</p>
        {weeks < 12 ? (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setWeeks((current) => current + 4);
            }}
            className="text-ink mt-1 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
          >
            {t("lookFurther")}
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  const current = days.find((day) => day.key === preferredDay) ?? days[0];
  const timeFormat = new Intl.DateTimeFormat(tag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex scrollbar-none gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => setPreferredDay(day.key)}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium capitalize transition-colors",
              day.key === current.key
                ? "text-ink-inverse"
                : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink border",
            )}
          >
            {day.key === current.key ? (
              <motion.span
                layoutId="slot-day-active"
                className="bg-ink absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">{day.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {current.slots.map((slot) => {
          const active = selected === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              onClick={() => onSelect(active ? null : slot.start)}
              aria-pressed={active}
              className={cn(
                "rounded-[var(--radius-xs)] border px-2 py-2.5 text-[13.5px] font-medium tabular-nums transition-all",
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-line-strong text-ink hover:border-ink/40 hover:bg-ink/[0.03]",
              )}
            >
              {timeFormat.format(new Date(slot.start))}
            </button>
          );
        })}
      </div>

      <p className="text-ink-subtle text-[12px]">
        {t("timezoneNote", { timezone: timezone.replace(/_/g, " ") })}
      </p>
    </div>
  );
}
