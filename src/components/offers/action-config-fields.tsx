"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { ChoiceChips } from "@/components/ui/choice-cards";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toggle, ToggleRow } from "@/components/ui/primitives";
import { ScaleSlider } from "@/components/ui/slider";
import { minutesToLabel } from "@/lib/offers/meta";
import {
  BUFFER_STOPS,
  CAPACITY_STOPS,
  DURATION_STOPS,
  HORIZON_STOPS,
  INTERVAL_STOPS,
  NOTICE_STOPS,
  QUANTITY_STOPS,
} from "@/lib/scales";
import type {
  ActionType,
  AnyActionConfig,
  AskPhone,
  CalendarBookingConfig,
  ContactRequestConfig,
  DirectReservationConfig,
  OnlinePayment,
  QuoteRequestConfig,
  WhatsappDirectConfig,
} from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

type Patch<T> = (patch: Partial<T>) => void;

/** Whether online payment can even be offered on this offer, and why not. */
export type PaymentReadiness = {
  /** The coach has at least one gateway connected and cleared to charge. */
  gatewayReady: boolean;
  /** The price is a firm amount — not "from", not "on request", not free. */
  priceIsFirm: boolean;
};

const validCapacity = (text: string) =>
  /^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= 10000;

/**
 * Settings that depend on the action type — never on the profession.
 *
 * Each type shows the one or two settings a coach actually has to think
 * about, and folds the rest into "Advanced settings", closed by default. The
 * defaults in lib/offers/schema.ts make an offer work as it is, so leaving
 * that section closed is a real choice, not an unfinished form: its closed
 * state says in one line what those defaults are.
 */
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

/* -------------------------------------------------------------------------- */
/* Advanced settings                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The fold. Closed, it is one row: its name and what the defaults currently
 * are, so nothing is hidden, only postponed. Open, it holds the controls.
 */
function Advanced({ summary, children }: { summary: string; children: ReactNode }) {
  const t = useTranslations("offers.config");
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="border-line rounded-[var(--radius-md)] border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="hover:bg-ink/[0.02] flex w-full items-center justify-between gap-4 rounded-[var(--radius-md)] px-4 py-3.5 text-left transition-colors"
      >
        <span className="min-w-0">
          <span className="text-ink block text-[14px] font-medium">{t("advanced")}</span>
          <span className="text-ink-muted mt-0.5 block text-[12.5px] leading-relaxed">
            {open ? t("advancedHint") : summary}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "text-ink-subtle size-4 shrink-0 motion-safe:transition-transform motion-safe:duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div id={id} className="border-line space-y-5 border-t px-4 pt-4 pb-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** "Aucune pause · préavis de 12 heures · …", first letter up. */
function sentence(parts: (string | null | undefined | false)[]): string {
  const text = parts.filter(Boolean).join(" · ");
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function usePhoneSummary() {
  const t = useTranslations("offers.config.summary");
  return (value: AskPhone) => t(`phone.${value}`);
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

/* -------------------------------------------------------------------------- */
/* Per action type                                                             */
/* -------------------------------------------------------------------------- */

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
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();
  // Past two days, a notice reads better in days: "3 jours", not "72 heures".
  const hoursLabel = (hours: number) =>
    hours >= 48 && hours % 24 === 0
      ? t("days", { count: hours / 24 })
      : t("hours", { count: hours });

  const summary = sentence([
    config.buffer_minutes === 0
      ? s("bufferNone")
      : s("buffer", { value: minutesToLabel(config.buffer_minutes, locale) }),
    config.min_notice_hours === 0
      ? s("noticeNone")
      : s("notice", { value: hoursLabel(config.min_notice_hours) }),
    s("horizon", { value: t("days", { count: config.max_days_ahead }) }),
    config.requires_confirmation ? s("confirmManual") : s("confirmAuto"),
    phone(config.ask_phone),
    config.online_payment !== "off" && s("paymentOn"),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("duration")} hint={t("durationHint")}>
        <ScaleSlider
          label={t("duration")}
          stops={DURATION_STOPS}
          value={config.duration_minutes}
          onChange={(duration_minutes) => patch({ duration_minutes })}
          format={(minutes) => minutesToLabel(minutes, locale)}
          edges={[
            minutesToLabel(DURATION_STOPS[0], locale),
            minutesToLabel(DURATION_STOPS.at(-1)!, locale),
          ]}
        />
      </Field>

      <Advanced summary={summary}>
        <Field label={t("buffer")} hint={t("bufferHint")}>
          <ScaleSlider
            label={t("buffer")}
            stops={BUFFER_STOPS}
            value={config.buffer_minutes}
            onChange={(buffer_minutes) => patch({ buffer_minutes })}
            format={(minutes) => (minutes === 0 ? t("noBuffer") : minutesToLabel(minutes, locale))}
          />
        </Field>

        <Field label={t("interval")} hint={t("intervalHint")}>
          <ScaleSlider
            label={t("interval")}
            stops={INTERVAL_STOPS}
            value={config.slot_interval_minutes}
            onChange={(slot_interval_minutes) => patch({ slot_interval_minutes })}
            format={(minutes) =>
              minutes === null ? t("intervalDefault") : minutesToLabel(minutes, locale)
            }
          />
        </Field>

        <Field label={t("notice")} hint={t("noticeHint")}>
          <ScaleSlider
            label={t("notice")}
            stops={NOTICE_STOPS}
            value={config.min_notice_hours}
            onChange={(min_notice_hours) => patch({ min_notice_hours })}
            format={(hours) => (hours === 0 ? t("noNotice") : hoursLabel(hours))}
          />
        </Field>

        <Field label={t("horizon")} hint={t("horizonHint")}>
          <ScaleSlider
            label={t("horizon")}
            stops={HORIZON_STOPS}
            value={config.max_days_ahead}
            onChange={(max_days_ahead) => patch({ max_days_ahead })}
            format={(days) => t("days", { count: days })}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />

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
      </Advanced>
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
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();
  // Typed text, kept apart from the number so "1" on the way to "120" is not
  // snapped to a stop mid-keystroke.
  const [capacityText, setCapacityText] = useState(
    config.capacity === null ? "" : String(config.capacity),
  );

  const summary = sentence([
    s("maxQuantity", { count: config.max_quantity_per_booking }),
    config.requires_confirmation ? s("confirmManual") : s("confirmAuto"),
    phone(config.ask_phone),
    config.online_payment !== "off" && s("paymentOn"),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("capacity")} hint={t("capacityHint")}>
        <ScaleSlider
          label={t("capacity")}
          stops={CAPACITY_STOPS}
          value={config.capacity}
          onChange={(capacity) => {
            patch({ capacity });
            setCapacityText(capacity === null ? "" : String(capacity));
          }}
          format={(capacity) => (capacity === null ? t("unlimited") : String(capacity))}
          edges={["1", t("unlimited")]}
          exact={{
            min: 1,
            max: 10000,
            step: 1,
            text: capacityText,
            invalid: capacityText !== "" && !validCapacity(capacityText),
            onText: (text) => {
              setCapacityText(text);
              if (text === "") patch({ capacity: null });
              else if (validCapacity(text)) patch({ capacity: Number(text) });
            },
          }}
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

      <Advanced summary={summary}>
        <Field label={t("maxQuantity")} hint={t("maxQuantityHint")}>
          <ScaleSlider
            label={t("maxQuantity")}
            stops={QUANTITY_STOPS}
            value={config.max_quantity_per_booking}
            onChange={(max_quantity_per_booking) => patch({ max_quantity_per_booking })}
            format={(count) => String(count)}
          />
        </Field>

        <Field label={t("quantityLabel")} hint={t("quantityLabelHint")} optional>
          <Input
            value={config.quantity_label ?? ""}
            placeholder={t("quantityLabelPlaceholder")}
            onChange={(event) => patch({ quantity_label: event.target.value || null })}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />

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
      </Advanced>
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
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();

  const summary = sentence([
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
    phone(config.ask_phone),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("messagePrompt")} hint={t("messagePromptHint")} optional>
        <Textarea
          rows={2}
          value={config.message_prompt ?? ""}
          placeholder={t("messagePromptPlaceholder")}
          onChange={(event) => patch({ message_prompt: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
        <Field label={t("ctaLabel")} hint={t("ctaLabelHint")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaContactPlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>

        <AskPhoneField value={config.ask_phone} onChange={(ask_phone) => patch({ ask_phone })} />
      </Advanced>
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
  const s = useTranslations("offers.config.summary");

  // Without a number on the profile, the offer cannot work until one is
  // given here — so the field stays out in the open. With one, it is an
  // override, and an override is advanced.
  const numberField = (
    <Field
      label={t("whatsappNumber")}
      hint={
        profileWhatsapp
          ? t("whatsappNumberHint", { number: profileWhatsapp })
          : t("whatsappNumberMissing")
      }
      optional={Boolean(profileWhatsapp)}
    >
      <Input
        type="tel"
        inputMode="tel"
        value={config.whatsapp_number ?? ""}
        placeholder="+33 6 12 34 56 78"
        onChange={(event) => patch({ whatsapp_number: event.target.value || null })}
      />
    </Field>
  );

  const summary = sentence([
    config.whatsapp_number
      ? s("whatsappOwn", { number: config.whatsapp_number })
      : profileWhatsapp && s("whatsappProfile", { number: profileWhatsapp }),
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
  ]);

  return (
    <div className="space-y-5">
      {profileWhatsapp ? null : numberField}

      <Field label={t("prefilledMessage")} hint={t("prefilledMessageHint")} optional>
        <Textarea
          rows={2}
          value={config.prefilled_message ?? ""}
          placeholder={t("prefilledMessagePlaceholder")}
          onChange={(event) => patch({ prefilled_message: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
        {profileWhatsapp ? numberField : null}

        <Field label={t("ctaLabel")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaWhatsappPlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>
      </Advanced>
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
  const s = useTranslations("offers.config.summary");
  const phone = usePhoneSummary();

  const summary = sentence([
    config.ask_budget && s("budget"),
    config.ask_preferred_date && s("dateAsked"),
    phone(config.ask_phone),
    config.cta_label ? s("ctaCustom", { label: config.cta_label }) : s("ctaDefault"),
  ]);

  return (
    <div className="space-y-5">
      <Field label={t("briefPrompt")} hint={t("briefPromptHint")} optional>
        <Textarea
          rows={2}
          value={config.brief_prompt ?? ""}
          placeholder={t("briefPromptPlaceholder")}
          onChange={(event) => patch({ brief_prompt: event.target.value || null })}
        />
      </Field>

      <Advanced summary={summary}>
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

        <Field label={t("ctaLabel")} optional>
          <Input
            value={config.cta_label ?? ""}
            placeholder={t("ctaQuotePlaceholder")}
            onChange={(event) => patch({ cta_label: event.target.value || null })}
          />
        </Field>
      </Advanced>
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
