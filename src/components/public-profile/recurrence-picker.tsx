"use client";

import { Check, Minus, Plus, Repeat, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { previewBookingSeries } from "@/actions/public-booking";
import { Button } from "@/components/ui/button";
import {
  RECURRENCE_FREQUENCIES,
  SERIES_LIMITS,
  type RecurrenceFrequency,
} from "@/lib/scheduling/series";
import { cn } from "@/lib/utils";

export type Recurrence = { frequency: RecurrenceFrequency; count: number } | null;

type Session = { start: string; available: boolean };

/**
 * "Once" or a series, under the slot the client picked.
 *
 * Choosing a rhythm lays the dates out underneath, each one checked against
 * the coach's calendar as it arrives — a tick for a free session, a cross for
 * one already taken or closed. The client sees exactly which sessions the
 * booking will hold before sending it; nothing is booked from this list, the
 * server checks every date again.
 */
export function RecurrencePicker({
  offerId,
  start,
  seats,
  value,
  onChange,
  locale,
}: {
  offerId: string;
  /** The first session: the slot picked above. */
  start: string;
  seats: number;
  value: Recurrence;
  onChange: (value: Recurrence) => void;
  locale: string;
}) {
  const t = useTranslations("publicProfile.booking.recurrence");
  // The answer is kept with the question it answers: while a newer question
  // is out, the previous dates stay on screen, dimmed, instead of blinking out.
  const question = value ? `${offerId}|${start}|${seats}|${value.frequency}|${value.count}` : null;
  const [answer, setAnswer] = useState<{ question: string; sessions: Session[] } | null>(null);
  const sessions = answer?.sessions ?? null;
  const loading = question !== null && answer?.question !== question;

  useEffect(() => {
    if (!value || !question) return;
    let cancelled = false;
    previewBookingSeries({ offer_id: offerId, start, seats, ...value }).then((result) => {
      if (!cancelled) setAnswer({ question, sessions: result.ok ? (result.data ?? []) : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [offerId, start, seats, value, question]);

  const day = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const free = sessions?.filter((session) => session.available).length ?? 0;

  return (
    <div className="border-line space-y-3 rounded-[var(--radius-md)] border p-3.5">
      <p className="text-ink flex items-center gap-1.5 text-[13px] font-medium">
        <Repeat className="size-3.5 text-[var(--accent)]" aria-hidden />
        {t("title")}
      </p>

      <div role="radiogroup" aria-label={t("title")} className="flex flex-wrap gap-1.5">
        {([null, ...RECURRENCE_FREQUENCIES] as const).map((frequency) => {
          const on = (value?.frequency ?? null) === frequency;
          return (
            <button
              key={frequency ?? "once"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(frequency ? { frequency, count: value?.count ?? 4 } : null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.96]",
                on
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-on)]"
                  : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
              )}
            >
              {t(`frequency.${frequency ?? "once"}`)}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {value ? (
          <motion.div
            key="series"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <span className="text-ink-muted text-[13px]">{t("count")}</span>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={() =>
                  onChange({ ...value, count: Math.max(SERIES_LIMITS.min, value.count - 1) })
                }
                aria-label={t("fewer")}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="text-ink w-6 text-center text-[15px] font-semibold tabular-nums">
                {value.count}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={() =>
                  onChange({ ...value, count: Math.min(SERIES_LIMITS.max, value.count + 1) })
                }
                aria-label={t("more")}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <ul className={cn("grid gap-1.5 sm:grid-cols-2", loading && "opacity-60")}>
              {(sessions ?? []).map((session, index) => (
                <motion.li
                  key={session.start}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-1.5 text-[12.5px] tabular-nums",
                    session.available
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "bg-ink/[0.03] text-ink-subtle line-through",
                  )}
                >
                  {session.available ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <X className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="capitalize">{day.format(new Date(session.start))}</span>
                  <span className="sr-only">
                    {session.available ? t("available") : t("unavailable")}
                  </span>
                </motion.li>
              ))}
            </ul>

            {sessions ? (
              <p className="text-ink-muted text-[12.5px]" aria-live="polite">
                {free === sessions.length
                  ? t("allFree", { count: free })
                  : t("someTaken", { free, total: sessions.length })}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
