"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChoiceChips } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toggle, ToggleRow } from "@/components/ui/primitives";
import { minutesToLabel } from "@/lib/offers/meta";
import type {
  ActionType,
  AnyActionConfig,
  CalendarBookingConfig,
  ContactRequestConfig,
  DirectReservationConfig,
  OnlinePayment,
  QuoteRequestConfig,
  WhatsappDirectConfig,
} from "@/lib/offers/schema";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const BUFFERS = [0, 5, 10, 15, 30, 45, 60];
const NOTICES = [0, 1, 2, 4, 12, 24, 48, 72];
const HORIZONS = [7, 14, 30, 60, 90, 180, 365];

type Patch<T> = (patch: Partial<T>) => void;

/** Whether online payment can even be offered on this offer, and why not. */
export type PaymentReadiness = {
  /** The coach has at least one gateway connected and cleared to charge. */
  gatewayReady: boolean;
  /** The price is a firm amount — not "from", not "on request", not free. */
  priceIsFirm: boolean;
};

/** Settings that depend on the action type — never on the profession. */
export function ActionConfigFields({
  actionType,
  config,
  onChange,
  locale,
  profileWhatsapp,
  payments,
}: {
  actionType: ActionType;
  config: AnyActionConfig;
  onChange: (config: AnyActionConfig) => void;
  locale: string;
  profileWhatsapp?: string | null;
  payments: PaymentReadiness;
}) {
  const patch = (values: Record<string, unknown>) =>
    onChange({ ...(config as Record<string, unknown>), ...values } as AnyActionConfig);

  switch (actionType) {
    case "calendar_booking":
      return (
        <CalendarFields
          config={config as CalendarBookingConfig}
          patch={patch as Patch<CalendarBookingConfig>}
          locale={locale}
          payments={payments}
        />
      );
    case "direct_reservation":
      return (
        <ReservationFields
          config={config as DirectReservationConfig}
          patch={patch as Patch<DirectReservationConfig>}
          payments={payments}
        />
      );
    case "contact_request":
      return (
        <ContactFields
          config={config as ContactRequestConfig}
          patch={patch as Patch<ContactRequestConfig>}
        />
      );
    case "whatsapp_direct":
      return (
        <WhatsappFields
          config={config as WhatsappDirectConfig}
          patch={patch as Patch<WhatsappDirectConfig>}
          profileWhatsapp={profileWhatsapp}
        />
      );
    case "quote_request":
      return (
        <QuoteFields
          config={config as QuoteRequestConfig}
          patch={patch as Patch<QuoteRequestConfig>}
        />
      );
  }
}

/**
 * A closed set of numbers - a duration, a notice, a horizon - as pills rather
 * than a menu.
 *
 * Every value here is one of a handful the product already decided on, so the
 * dropdown was hiding ten known answers behind a tap and a scroll. Laid out
 * they are one tap, and the shape of the scale (15 minutes to 4 hours) is
 * readable at a glance. `null` is a value like any other: it is what "same as
 * the duration" means for the slot interval.
 */
function NumberChoice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: readonly { value: number | null; label: string }[];
}) {
  return (
    <ChoiceChips
      label={label}
      value={String(value)}
      onChange={(next) => onChange(next === "null" ? null : Number(next))}
      options={options.map((option) => ({ value: String(option.value), label: option.label }))}
    />
  );
}

function AskPhoneField({
  value,
  onChange,
}: {
  value: "hidden" | "optional" | "required";
  onChange: (value: "hidden" | "optional" | "required") => void;
}) {
  const t = useTranslations("offers.config");

  return (
    <Field label={t("askPhone")}>
      <ChoiceChips
        label={t("askPhone")}
        value={value}
        onChange={onChange}
        options={[
          { value: "hidden", label: t("askPhoneHidden") },
          { value: "optional", label: t("askPhoneOptional") },
          { value: "required", label: t("askPhoneRequired") },
        ]}
      />
    </Field>
  );
}

function CalendarFields({
  config,
  patch,
  locale,
  payments,
}: {
  config: CalendarBookingConfig;
  patch: Patch<CalendarBookingConfig>;
  locale: string;
  payments: PaymentReadiness;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        <Field label={t("duration")} hint={t("durationHint")}>
          <NumberChoice
            label={t("duration")}
            value={config.duration_minutes}
            onChange={(duration_minutes) => patch({ duration_minutes: duration_minutes ?? 60 })}
            options={DURATIONS.map((minutes) => ({
              value: minutes,
              label: minutesToLabel(minutes, locale),
            }))}
          />
        </Field>

        <Field label={t("buffer")} hint={t("bufferHint")}>
          <NumberChoice
            label={t("buffer")}
            value={config.buffer_minutes}
            onChange={(buffer_minutes) => patch({ buffer_minutes: buffer_minutes ?? 0 })}
            options={BUFFERS.map((minutes) => ({
              value: minutes,
              label: minutes === 0 ? t("noBuffer") : minutesToLabel(minutes, locale),
            }))}
          />
        </Field>

        <Field label={t("interval")} hint={t("intervalHint")}>
          <NumberChoice
            label={t("interval")}
            value={config.slot_interval_minutes}
            onChange={(slot_interval_minutes) => patch({ slot_interval_minutes })}
            options={[
              { value: null, label: t("intervalDefault") },
              ...[15, 20, 30, 45, 60].map((minutes) => ({
                value: minutes,
                label: minutesToLabel(minutes, locale),
              })),
            ]}
          />
        </Field>

        <Field label={t("notice")} hint={t("noticeHint")}>
          <NumberChoice
            label={t("notice")}
            value={config.min_notice_hours}
            onChange={(min_notice_hours) => patch({ min_notice_hours: min_notice_hours ?? 0 })}
            options={NOTICES.map((hours) => ({
              value: hours,
              label: hours === 0 ? t("noNotice") : t("hours", { count: hours }),
            }))}
          />
        </Field>

        <Field label={t("horizon")} hint={t("horizonHint")}>
          <NumberChoice
            label={t("horizon")}
            value={config.max_days_ahead}
            onChange={(max_days_ahead) => patch({ max_days_ahead: max_days_ahead ?? 60 })}
            options={HORIZONS.map((days) => ({ value: days, label: t("days", { count: days }) }))}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
      </div>

      <div className="divide-line border-line divide-y border-y">
        <ToggleRow
          title={t("requiresConfirmation")}
          description={t("requiresConfirmationHint")}
          checked={config.requires_confirmation}
          onCheckedChange={(requires_confirmation) => patch({ requires_confirmation })}
        />
      </div>

      <OnlinePaymentField
        value={config.online_payment}
        onChange={(online_payment) => patch({ online_payment })}
        readiness={payments}
      />
    </div>
  );
}

function ReservationFields({
  config,
  patch,
  payments,
}: {
  config: DirectReservationConfig;
  patch: Patch<DirectReservationConfig>;
  payments: PaymentReadiness;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("capacity")} hint={t("capacityHint")}>
          <Input
            type="number"
            min={1}
            placeholder={t("unlimited")}
            value={config.capacity ?? ""}
            onChange={(event) =>
              patch({ capacity: event.target.value ? Number(event.target.value) : null })
            }
          />
        </Field>

        <Field label={t("dateMode")} hint={t("dateModeHint")}>
          <ChoiceChips
            label={t("dateMode")}
            value={config.date_mode}
            onChange={(date_mode) => patch({ date_mode })}
            options={[
              { value: "none", label: t("dateModeNone") },
              { value: "optional", label: t("dateModeOptional") },
              { value: "required", label: t("dateModeRequired") },
            ]}
          />
        </Field>

        <Field label={t("maxQuantity")} hint={t("maxQuantityHint")}>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.max_quantity_per_booking}
            onChange={(event) =>
              patch({ max_quantity_per_booking: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </Field>

        <Field label={t("quantityLabel")} hint={t("quantityLabelHint")}>
          <Input
            value={config.quantity_label ?? ""}
            placeholder={t("quantityLabelPlaceholder")}
            onChange={(event) => patch({ quantity_label: event.target.value || null })}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
      </div>

      <div className="divide-line border-line divide-y border-y">
        <ToggleRow
          title={t("requiresConfirmation")}
          description={t("requiresConfirmationHint")}
          checked={config.requires_confirmation}
          onCheckedChange={(requires_confirmation) => patch({ requires_confirmation })}
        />
      </div>

      <OnlinePaymentField
        value={config.online_payment}
        onChange={(online_payment) => patch({ online_payment })}
        readiness={payments}
      />
    </div>
  );
}

function ContactFields({
  config,
  patch,
}: {
  config: ContactRequestConfig;
  patch: Patch<ContactRequestConfig>;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-4">
      <Field label={t("ctaLabel")} hint={t("ctaLabelHint")} optional>
        <Input
          value={config.cta_label ?? ""}
          placeholder={t("ctaContactPlaceholder")}
          onChange={(event) => patch({ cta_label: event.target.value || null })}
        />
      </Field>

      <Field label={t("messagePrompt")} hint={t("messagePromptHint")} optional>
        <Textarea
          rows={2}
          value={config.message_prompt ?? ""}
          placeholder={t("messagePromptPlaceholder")}
          onChange={(event) => patch({ message_prompt: event.target.value || null })}
        />
      </Field>

      <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
    </div>
  );
}

function WhatsappFields({
  config,
  patch,
  profileWhatsapp,
}: {
  config: WhatsappDirectConfig;
  patch: Patch<WhatsappDirectConfig>;
  profileWhatsapp?: string | null;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-4">
      <Field
        label={t("whatsappNumber")}
        hint={
          profileWhatsapp
            ? t("whatsappNumberHint", { number: profileWhatsapp })
            : t("whatsappNumberMissing")
        }
        optional
      >
        <Input
          type="tel"
          inputMode="tel"
          value={config.whatsapp_number ?? ""}
          placeholder="+33 6 12 34 56 78"
          onChange={(event) => patch({ whatsapp_number: event.target.value || null })}
        />
      </Field>

      <Field label={t("prefilledMessage")} hint={t("prefilledMessageHint")} optional>
        <Textarea
          rows={2}
          value={config.prefilled_message ?? ""}
          placeholder={t("prefilledMessagePlaceholder")}
          onChange={(event) => patch({ prefilled_message: event.target.value || null })}
        />
      </Field>

      <Field label={t("ctaLabel")} optional>
        <Input
          value={config.cta_label ?? ""}
          placeholder={t("ctaWhatsappPlaceholder")}
          onChange={(event) => patch({ cta_label: event.target.value || null })}
        />
      </Field>
    </div>
  );
}

function QuoteFields({
  config,
  patch,
}: {
  config: QuoteRequestConfig;
  patch: Patch<QuoteRequestConfig>;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-4">
      <Field label={t("ctaLabel")} optional>
        <Input
          value={config.cta_label ?? ""}
          placeholder={t("ctaQuotePlaceholder")}
          onChange={(event) => patch({ cta_label: event.target.value || null })}
        />
      </Field>

      <Field label={t("briefPrompt")} hint={t("briefPromptHint")} optional>
        <Textarea
          rows={2}
          value={config.brief_prompt ?? ""}
          placeholder={t("briefPromptPlaceholder")}
          onChange={(event) => patch({ brief_prompt: event.target.value || null })}
        />
      </Field>

      <div className="divide-line border-line divide-y border-y">
        <ToggleRow
          title={t("askBudget")}
          description={t("askBudgetHint")}
          checked={config.ask_budget}
          onCheckedChange={(ask_budget) => patch({ ask_budget })}
        />
        <ToggleRow
          title={t("askPreferredDate")}
          description={t("askPreferredDateHint")}
          checked={config.ask_preferred_date}
          onCheckedChange={(ask_preferred_date) => patch({ ask_preferred_date })}
        />
      </div>

      <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
    </div>
  );
}

/**
 * The online-payment switch, on the two action types that carry an amount.
 *
 * It refuses to turn on rather than silently doing nothing: without a
 * connected gateway there is nobody to pay, and without a firm price there is
 * no amount to charge. Both cases say which one it is, and where to fix it.
 */
function OnlinePaymentField({
  value,
  onChange,
  readiness,
}: {
  value: OnlinePayment;
  onChange: (value: OnlinePayment) => void;
  readiness: PaymentReadiness;
}) {
  const t = useTranslations("offers.payment");
  const blocked = !readiness.gatewayReady || !readiness.priceIsFirm;

  return (
    <div className="border-line rounded-[var(--radius-md)] border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-ink text-[14px] font-medium">{t("title")}</p>
          <p className="text-ink-muted mt-0.5 text-[13px] leading-relaxed">{t("hint")}</p>
        </div>
        <Toggle
          checked={value !== "off"}
          disabled={blocked}
          onCheckedChange={(on) => onChange(on ? "required" : "off")}
          label={t("title")}
        />
      </div>

      {blocked ? (
        <p className="bg-ink/[0.03] text-ink-muted mt-3 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[12.5px] leading-relaxed">
          {!readiness.gatewayReady ? (
            <>
              {t("noGateway")}{" "}
              <Link href="/dashboard/settings" className="text-ink underline underline-offset-4">
                {t("noGatewayLink")}
              </Link>
            </>
          ) : (
            t("noFirmPrice")
          )}
        </p>
      ) : null}

      {value !== "off" ? (
        <div className="mt-4 space-y-2">
          {(["required", "optional"] as const).map((option) => (
            <label
              key={option}
              className="border-line hover:border-ink/25 flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border p-3 transition-colors"
            >
              <input
                type="radio"
                name="online-payment-mode"
                className="accent-ink mt-0.5"
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>
                <span className="text-ink block text-[13.5px] font-medium">
                  {t(`${option}.label` as "required.label")}
                </span>
                <span className="text-ink-muted mt-0.5 block text-[12.5px] leading-relaxed">
                  {t(`${option}.hint` as "required.hint")}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
