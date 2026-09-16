"use client";

import { CreditCard, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAccount, updateSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlays";
import { Card, CardHeader, ToggleRow } from "@/components/ui/primitives";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import type { Tables } from "@/lib/supabase/database.types";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "MAD", "XOF"];
const REMINDER_HOURS = [2, 4, 12, 24, 48, 72];

function timezoneOptions(current: string) {
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return supported.includes(current) ? supported : [current, ...supported];
}

export function SettingsForm({
  profile,
  accountEmail,
}: {
  profile: Tables<"profiles">;
  accountEmail: string;
}) {
  const t = useTranslations("dashboard.settings");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const router = useRouter();

  const channels = (profile.contact_channels ?? {}) as {
    email?: boolean;
    phone?: boolean;
    whatsapp?: boolean;
  };

  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? "");
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp_number ?? "");
  const [showEmail, setShowEmail] = useState(channels.email ?? true);
  const [showPhone, setShowPhone] = useState(channels.phone ?? false);
  const [showWhatsapp, setShowWhatsapp] = useState(channels.whatsapp ?? true);
  const [locale, setLocale] = useState(profile.locale);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [currency, setCurrency] = useState(profile.currency);
  const [reminderHours, setReminderHours] = useState(profile.reminder_hours_before);
  const [notify, setNotify] = useState(profile.notify_new_bookings);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const timezones = useMemo(() => timezoneOptions(profile.timezone), [profile.timezone]);

  function save() {
    startTransition(async () => {
      const result = await updateSettings({
        contact_email: contactEmail.trim() || null,
        phone_number: phone.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        contact_channels: { email: showEmail, phone: showPhone, whatsapp: showWhatsapp },
        locale,
        timezone,
        currency,
        reminder_hours_before: reminderHours,
        notify_new_bookings: notify,
      });

      if (result.ok) {
        setErrors({});
        toast.success(tCommon("saved"));
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(tError(result.error as "unexpected"));
      }
    });
  }

  const errorFor = (key: string) => (errors[key] ? tError(errors[key] as "unexpected") : null);

  return (
    <div className="space-y-6 pb-20">
      <Card className="p-5 sm:p-7">
        <CardHeader title={t("channelsTitle")} description={t("channelsHint")} />

        <div className="mt-5 space-y-5">
          <Field
            label={t("contactEmail")}
            hint={t("contactEmailHint")}
            error={errorFor("contact_email")}
          >
            <Input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder={accountEmail}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("phone")} error={errorFor("phone_number")} optional>
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </Field>
            <Field label={t("whatsapp")} error={errorFor("whatsapp_number")} optional>
              <Input
                type="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </Field>
          </div>

          <div className="divide-line border-line divide-y border-t">
            <ToggleRow
              title={t("showEmail")}
              description={t("showEmailHint")}
              checked={showEmail}
              onCheckedChange={setShowEmail}
            />
            <ToggleRow
              title={t("showPhone")}
              description={t("showPhoneHint")}
              checked={showPhone}
              onCheckedChange={setShowPhone}
            />
            <ToggleRow
              title={t("showWhatsapp")}
              description={t("showWhatsappHint")}
              checked={showWhatsapp}
              onCheckedChange={setShowWhatsapp}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("preferencesTitle")} description={t("preferencesHint")} />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={tCommon("language")}>
            <NativeSelect value={locale} onChange={(event) => setLocale(event.target.value)}>
              {LOCALES.map((item) => (
                <option key={item} value={item}>
                  {LOCALE_LABELS[item]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("currency")}>
            <NativeSelect value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("timezone")} hint={t("timezoneHint")} className="sm:col-span-2">
            <NativeSelect value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezones.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, " ")}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t("reminder")} hint={t("reminderHint")}>
            <NativeSelect
              value={String(reminderHours)}
              onChange={(event) => setReminderHours(Number(event.target.value))}
            >
              {REMINDER_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {t("reminderOption", { count: hours })}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="divide-line border-line mt-4 divide-y border-t">
          <ToggleRow
            title={t("notify")}
            description={t("notifyHint")}
            checked={notify}
            onCheckedChange={setNotify}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("paymentsTitle")} description={t("paymentsHint")} />
        <div className="bg-ink/[0.03] mt-4 flex items-start gap-3 rounded-[var(--radius-md)] p-4">
          <CreditCard className="text-ink-muted mt-0.5 size-4 shrink-0" />
          <p className="text-ink-muted text-[13.5px] leading-relaxed">{t("paymentsSoon")}</p>
        </div>
      </Card>

      <Card className="border-danger/20 p-5 sm:p-7">
        <CardHeader title={t("dangerTitle")} description={t("dangerHint")} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            {t("deleteAccount")}
          </Button>
          <span className="text-ink-subtle inline-flex items-center gap-1.5 text-[12.5px]">
            <Info className="size-3.5" />
            {t("deleteNote")}
          </span>
        </div>
      </Card>

      <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-6">
        <Button onClick={save} loading={pending} size="lg" className="shadow-[var(--shadow-float)]">
          {tCommon("save")}
        </Button>
      </div>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        size="sm"
        title={t("deleteTitle")}
        description={t("deleteBody", { email: accountEmail })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={confirmation.trim().toLowerCase() !== accountEmail.toLowerCase()}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAccount(confirmation);
                  if (result && !result.ok) toast.error(tError(result.error as "unexpected"));
                })
              }
            >
              {t("deleteConfirm")}
            </Button>
          </>
        }
      >
        <Field label={t("deleteConfirmLabel", { email: accountEmail })}>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={accountEmail}
            autoComplete="off"
          />
        </Field>
      </Modal>
    </div>
  );
}
