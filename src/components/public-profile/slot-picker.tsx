"use client";

import { CalendarX2, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Slot = { start: string; end: string; status: "available" | "unavailable" };

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

  return [...groups.entries()].map(([key, value]) => ({
    key,
    ...value,
    open: value.slots.filter((slot) => slot.status === "available").length,
  }));
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
  /** Day the visitor tapped; the first day with an opening is used until then. */
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

  const openings = days.reduce((total, day) => total + day.open, 0);

  const lookFurther =
    weeks < 12 ? (
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
    ) : null;

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
        {lookFurther}
      </div>
    );
  }

  // Land on a day the visitor can actually book, not just the first one shown.
  const current =
    days.find((day) => day.key === preferredDay) ?? days.find((day) => day.open > 0) ?? days[0];
  const timeFormat = new Intl.DateTimeFormat(tag, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex scrollbar-none gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day) => {
          const isCurrent = day.key === current.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setPreferredDay(day.key)}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium capitalize transition-colors",
                isCurrent
                  ? "text-ink-inverse"
                  : cn(
                      "border-line-strong hover:border-ink/30 hover:text-ink border",
                      day.open > 0 ? "text-ink-muted" : "text-ink-subtle",
                    ),
              )}
            >
              {isCurrent ? (
                <motion.span
                  layoutId="slot-day-active"
                  className="bg-ink absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative flex items-center gap-1.5">
                {day.label}
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    // On the selected day the chip is filled with ink, so the
                    // dot has to be its inverse and not a fixed white.
                    day.open > 0
                      ? isCurrent
                        ? "bg-ink-inverse/70"
                        : "bg-[var(--accent)]"
                      : "bg-ink/15",
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {current.slots.map((slot) => {
          const time = timeFormat.format(new Date(slot.start));
          const taken = slot.status === "unavailable";
          const active = selected === slot.start;

          if (taken) {
            return (
              <span
                key={slot.start}
                aria-disabled="true"
                aria-label={t("slotUnavailable", { time })}
                className="bg-ink/[0.03] border-line text-ink-subtle cursor-not-allowed rounded-[var(--radius-xs)] border px-2 py-2.5 text-center text-[13.5px] font-medium tabular-nums line-through decoration-1"
              >
                {time}
              </span>
            );
          }

          return (
            <motion.button
              key={slot.start}
              type="button"
              onClick={() => onSelect(active ? null : slot.start)}
              aria-pressed={active}
              // Transforms are dropped under prefers-reduced-motion by
              // MotionProvider; the colour change carries the state on its own.
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "rounded-[var(--radius-xs)] border px-2 py-2.5 text-[13.5px] font-medium tabular-nums transition-colors duration-200",
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-on)] shadow-[var(--shadow-card)]"
                  : "border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:border-[var(--accent)]",
              )}
            >
              {time}
            </motion.button>
          );
        })}
      </div>

      {openings === 0 ? (
        <div className="text-ink-muted bg-ink/[0.02] rounded-[var(--radius-sm)] px-4 py-3 text-center text-[13px]">
          <p>{t("allTaken")}</p>
          {lookFurther}
        </div>
      ) : null}

      <div className="text-ink-subtle flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)]" />
          {t("legendAvailable")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-line bg-ink/[0.03] size-2.5 rounded-full border" />
          {t("legendUnavailable")}
        </span>
        <span>{t("timezoneNote", { timezone: timezone.replace(/_/g, " ") })}</span>
      </div>
    </div>
  );
}
