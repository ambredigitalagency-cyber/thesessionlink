"use client";

import { useTranslations } from "next-intl";

import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { ToggleRow } from "@/components/ui/primitives";
import { minutesToLabel } from "@/lib/offers/meta";
import type {
  ActionType,
  AnyActionConfig,
  CalendarBookingConfig,
  ContactRequestConfig,
  DirectReservationConfig,
  QuoteRequestConfig,
  WhatsappDirectConfig,
} from "@/lib/offers/schema";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const BUFFERS = [0, 5, 10, 15, 30, 45, 60];
const NOTICES = [0, 1, 2, 4, 12, 24, 48, 72];
const HORIZONS = [7, 14, 30, 60, 90, 180, 365];

type Patch<T> = (patch: Partial<T>) => void;

/** Settings that depend on the action type — never on the profession. */
export function ActionConfigFields({
  actionType,
  config,
  onChange,
  locale,
  profileWhatsapp,
}: {
  actionType: ActionType;
  config: AnyActionConfig;
  onChange: (config: AnyActionConfig) => void;
  locale: string;
  profileWhatsapp?: string | null;
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
        />
      );
    case "direct_reservation":
      return (
        <ReservationFields
          config={config as DirectReservationConfig}
          patch={patch as Patch<DirectReservationConfig>}
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
      <NativeSelect
        value={value}
        onChange={(event) => onChange(event.target.value as "hidden" | "optional" | "required")}
      >
        <option value="hidden">{t("askPhoneHidden")}</option>
        <option value="optional">{t("askPhoneOptional")}</option>
        <option value="required">{t("askPhoneRequired")}</option>
      </NativeSelect>
    </Field>
  );
}

function CalendarFields({
  config,
  patch,
  locale,
}: {
  config: CalendarBookingConfig;
  patch: Patch<CalendarBookingConfig>;
  locale: string;
}) {
  const t = useTranslations("offers.config");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("duration")} hint={t("durationHint")}>
          <NativeSelect
            value={String(config.duration_minutes)}
            onChange={(event) => patch({ duration_minutes: Number(event.target.value) })}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutesToLabel(minutes, locale)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={t("buffer")} hint={t("bufferHint")}>
          <NativeSelect
            value={String(config.buffer_minutes)}
            onChange={(event) => patch({ buffer_minutes: Number(event.target.value) })}
          >
            {BUFFERS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? t("noBuffer") : minutesToLabel(minutes, locale)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={t("interval")} hint={t("intervalHint")}>
          <NativeSelect
            value={
              config.slot_interval_minutes === null ? "" : String(config.slot_interval_minutes)
            }
            onChange={(event) =>
              patch({
                slot_interval_minutes: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">{t("intervalDefault")}</option>
            {[15, 20, 30, 45, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutesToLabel(minutes, locale)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={t("notice")} hint={t("noticeHint")}>
          <NativeSelect
            value={String(config.min_notice_hours)}
            onChange={(event) => patch({ min_notice_hours: Number(event.target.value) })}
          >
            {NOTICES.map((hours) => (
              <option key={hours} value={hours}>
                {hours === 0 ? t("noNotice") : t("hours", { count: hours })}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={t("horizon")} hint={t("horizonHint")}>
          <NativeSelect
            value={String(config.max_days_ahead)}
            onChange={(event) => patch({ max_days_ahead: Number(event.target.value) })}
          >
            {HORIZONS.map((days) => (
              <option key={days} value={days}>
                {t("days", { count: days })}
              </option>
            ))}
          </NativeSelect>
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
    </div>
  );
}

function ReservationFields({
  config,
  patch,
}: {
  config: DirectReservationConfig;
  patch: Patch<DirectReservationConfig>;
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
          <NativeSelect
            value={config.date_mode}
            onChange={(event) =>
              patch({ date_mode: event.target.value as DirectReservationConfig["date_mode"] })
            }
          >
            <option value="none">{t("dateModeNone")}</option>
            <option value="optional">{t("dateModeOptional")}</option>
            <option value="required">{t("dateModeRequired")}</option>
          </NativeSelect>
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
