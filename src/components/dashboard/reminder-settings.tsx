"use client";

import { BellRing, CalendarClock, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Field, Textarea } from "@/components/ui/field";
import { ScaleSlider } from "@/components/ui/slider";
import {
  REMINDER_MESSAGE_MAX,
  REMINDER_TOKENS,
  renderReminderMessage,
  type ReminderToken,
} from "@/lib/emails/reminder-text";
import { REMINDER_STOPS } from "@/lib/scales";
import { cn } from "@/lib/utils";

/**
 * The reminder, set where it is read: the delay on its slider, the coach's own
 * message with its three tokens one tap away, and — beside them — the email
 * as the client will get it, rewritten on every keystroke with a sample
 * booking. What you type is what they read.
 */
export function ReminderSettings({
  hours,
  onHours,
  message,
  onMessage,
  proName,
  error,
}: {
  hours: number;
  onHours: (hours: number) => void;
  message: string;
  onMessage: (message: string) => void;
  proName: string;
  error?: string | null;
}) {
  const t = useTranslations("dashboard.settings");
  const area = useRef<HTMLTextAreaElement>(null);

  const delay = (value: number) =>
    value >= 48 && value % 24 === 0
      ? t("reminderOptionDays", { count: value / 24 })
      : t("reminderOption", { count: value });

  const sample = {
    client: t("reminderSample.client"),
    offer: t("reminderSample.offer"),
    time: t("reminderSample.time"),
  };
  const preview = renderReminderMessage(message, sample);

  /** Puts the token where the caret is, and the caret right after it. */
  function insert(token: ReminderToken) {
    const node = area.current;
    const text = `{${token}}`;
    const start = node?.selectionStart ?? message.length;
    const end = node?.selectionEnd ?? message.length;
    const next = (message.slice(0, start) + text + message.slice(end)).slice(
      0,
      REMINDER_MESSAGE_MAX,
    );
    onMessage(next);
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)]">
      <div className="space-y-5">
        <Field label={t("reminder")} hint={t("reminderHint")}>
          <ScaleSlider
            label={t("reminder")}
            stops={REMINDER_STOPS}
            value={hours}
            onChange={onHours}
            format={delay}
          />
        </Field>

        <Field label={t("reminderMessage")} hint={t("reminderMessageHint")} error={error} optional>
          <Textarea
            ref={area}
            rows={4}
            value={message}
            maxLength={REMINDER_MESSAGE_MAX}
            onChange={(event) => onMessage(event.target.value)}
            placeholder={t("reminderMessagePlaceholder")}
          />
        </Field>

        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <span className="text-ink-subtle text-[12.5px]">{t("reminderInsert")}</span>
          {REMINDER_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insert(token)}
              className="border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-[color,border-color,transform] duration-200 active:scale-[0.96]"
            >
              <Plus className="size-3" aria-hidden />
              {t(`reminderTokens.${token}`)}
            </button>
          ))}
          <span
            className={cn(
              "ml-auto text-[12px] tabular-nums",
              message.length > REMINDER_MESSAGE_MAX * 0.9 ? "text-warning" : "text-ink-subtle",
            )}
          >
            {t("reminderCount", { count: message.length, max: REMINDER_MESSAGE_MAX })}
          </span>
        </div>
      </div>

      {/* The email, as it lands. */}
      <figure aria-label={t("reminderPreview")} className="self-start">
        <figcaption className="text-ink-subtle mb-2 text-[12px] font-medium tracking-wide uppercase">
          {t("reminderPreview")}
        </figcaption>
        <div className="border-line bg-surface overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-card)]">
          <div className="border-line flex items-center gap-2 border-b px-4 py-2.5">
            <BellRing className="size-3.5 text-[var(--accent)]" aria-hidden />
            <p className="text-ink truncate text-[13px] font-semibold">
              {sample.offer} · {proName}
            </p>
          </div>
          <div className="space-y-3 px-4 py-3.5">
            <motion.p
              key={hours}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--accent-ink)]"
            >
              <CalendarClock className="size-3" aria-hidden />
              {t("reminderPreviewSent", { delay: delay(hours) })}
            </motion.p>

            <AnimatePresence mode="popLayout" initial={false}>
              {preview ? (
                <motion.blockquote
                  key="message"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-l-2 border-[var(--accent)] pl-3"
                >
                  <p className="text-ink-subtle text-[11.5px] font-medium">
                    {t("reminderFrom", { pro: proName })}
                  </p>
                  <p className="text-ink mt-0.5 text-[13px] leading-relaxed break-words whitespace-pre-line">
                    {preview}
                  </p>
                </motion.blockquote>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-ink-subtle text-[12.5px] leading-relaxed"
                >
                  {t("reminderPreviewEmpty")}
                </motion.p>
              )}
            </AnimatePresence>

            <dl className="bg-ink/[0.03] space-y-1 rounded-[var(--radius-xs)] px-3 py-2 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-subtle">{t("reminderTokens.offer")}</dt>
                <dd className="text-ink text-right">{sample.offer}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-subtle">{t("reminderTokens.time")}</dt>
                <dd className="text-ink text-right">{sample.time}</dd>
              </div>
            </dl>
          </div>
        </div>
      </figure>
    </div>
  );
}
