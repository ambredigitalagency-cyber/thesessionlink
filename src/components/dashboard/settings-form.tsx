"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { updateSettings } from "@/actions/settings";
import { DeleteAccountButton } from "@/components/dashboard/delete-account";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/primitives";
import { notify } from "@/lib/notify";
import { DELETION_GRACE_DAYS } from "@/lib/account/deletion";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import type { Tables } from "@/lib/supabase/database.types";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "MAD", "XOF"];

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

  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? "");
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp_number ?? "");
  const [locale, setLocale] = useState(profile.locale);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [currency, setCurrency] = useState(profile.currency);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const timezones = useMemo(() => timezoneOptions(profile.timezone), [profile.timezone]);

  function save() {
    startTransition(async () => {
      const result = await updateSettings({
        contact_email: contactEmail.trim() || null,
        phone_number: phone.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        locale,
        timezone,
        currency,
      });

      if (result.ok) {
        setErrors({});
        notify.success(tCommon("saved"));
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        notify.error(tError(result.error as "unexpected"));
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
        </div>
      </Card>

      <Card className="border-danger/20 p-5 sm:p-7">
        <CardHeader
          title={t("dangerTitle")}
          description={t("dangerHint", { count: DELETION_GRACE_DAYS })}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DeleteAccountButton accountEmail={accountEmail} />
          <span className="text-ink-subtle inline-flex items-center gap-1.5 text-[12.5px]">
            <Info className="size-3.5" />
            {t("deleteNote", { count: DELETION_GRACE_DAYS })}
          </span>
        </div>
      </Card>

      <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-6">
        <Button onClick={save} loading={pending} size="lg" className="shadow-[var(--shadow-float)]">
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
