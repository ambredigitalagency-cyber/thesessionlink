"use client";

import { Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { updateClientRecord } from "@/actions/clients";
import { ClientTags, SegmentBadges } from "@/components/dashboard/client-tags";
import { CustomFieldsEditor } from "@/components/offers/custom-fields-editor";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge, Card, CardHeader, ProfileAvatar } from "@/components/ui/primitives";
import { notify } from "@/lib/notify";
import type { Segment } from "@/lib/crm/segments";
import { parseOfferFields, type OfferField } from "@/lib/offers/fields";
import { ACTION_ICONS, BOOKING_STATUS_TONE } from "@/lib/offers/meta";
import type { ActionType } from "@/lib/offers/schema";
import type { Tables } from "@/lib/supabase/database.types";

type ClientBooking = {
  id: string;
  offer_title: string;
  action_type: ActionType;
  starts_at: string | null;
  requested_date: string | null;
  quantity: number;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

export function ClientDetail({
  client,
  bookings,
  segments,
  tagVocabulary,
  timezone,
  locale,
}: {
  client: Tables<"clients">;
  bookings: ClientBooking[];
  /** Computed on the server from the coach's whole client list. */
  segments: Segment[];
  tagVocabulary: string[];
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.clients");
  const tStatus = useTranslations("bookingStatus");
  const tCommon = useTranslations("common");
  const tError = useTranslations("errors");
  const tag = locale === "fr" ? "fr-FR" : "en-US";

  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [birthDate, setBirthDate] = useState(client.birth_date ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [healthNotes, setHealthNotes] = useState(client.health_notes ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [fields, setFields] = useState<OfferField[]>(() => parseOfferFields(client.custom_fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function saveDetails() {
    startTransition(async () => {
      const result = await updateClientRecord(client.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        birth_date: birthDate || null,
        address: address.trim() || null,
        health_notes: healthNotes.trim() || null,
        notes,
        custom_fields: fields,
      });

      if (result.ok) {
        setErrors({});
        notify.success(tCommon("saved"));
      } else {
        setErrors(result.fieldErrors ?? {});
        notify.error(tError(result.error as "unexpected"));
      }
    });
  }

  const formatWhen = (booking: ClientBooking) => {
    if (booking.starts_at) {
      return new Intl.DateTimeFormat(tag, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(booking.starts_at));
    }
    if (booking.requested_date) {
      return new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(`${booking.requested_date}T12:00:00Z`),
      );
    }
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: timezone }).format(
      new Date(booking.created_at),
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <ProfileAvatar name={client.name} className="size-14 text-[16px]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-ink text-[22px] font-semibold tracking-[-0.02em]">
                {client.name}
              </h1>
              <SegmentBadges segments={segments} />
            </div>
            <div className="text-ink-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
              <a
                href={`mailto:${client.email}`}
                className="hover:text-ink inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                <Mail className="size-3.5" />
                {client.email}
              </a>
              {client.phone ? (
                <a
                  href={`tel:${client.phone}`}
                  className="hover:text-ink inline-flex items-center gap-1.5 underline underline-offset-4"
                >
                  <Phone className="size-3.5" />
                  {client.phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label={t("name")}>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          </Field>
          <Field label={t("phone")} optional>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
              inputMode="tel"
            />
          </Field>
          <Field label={t("birthDate")} optional>
            <Input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </Field>
          <Field label={t("address")} optional>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={500}
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t("healthLabel")} hint={t("healthHint")} optional>
            <Textarea
              rows={3}
              value={healthNotes}
              onChange={(event) => setHealthNotes(event.target.value)}
              placeholder={t("healthPlaceholder")}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t("notesLabel")} hint={t("notesHint")}>
            <Textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("tagsTitle")} description={t("tagsHint")} />
        <div className="mt-5">
          <ClientTags clientId={client.id} tags={client.tags} vocabulary={tagVocabulary} />
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <CardHeader title={t("fieldsTitle")} description={t("fieldsHint")} />
        <div className="mt-5">
          <CustomFieldsEditor
            fields={fields}
            onChange={setFields}
            locale={locale}
            errors={errors}
          />
        </div>
      </Card>

      {/* One save for the whole record: the cards above are sections of a
          single form. Tags are the exception — they write on their own. */}
      <div className="flex justify-end">
        <Button onClick={saveDetails} loading={pending}>
          {tCommon("save")}
        </Button>
      </div>

      <Card className="p-5 sm:p-7">
        <CardHeader
          title={t("historyTitle")}
          description={t("historyCount", { count: bookings.length })}
        />

        <ul className="mt-5 space-y-2">
          {bookings.map((booking) => {
            const Icon = ACTION_ICONS[booking.action_type];
            return (
              <li
                key={booking.id}
                className="border-line flex items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3"
              >
                <Icon className="text-ink-subtle size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-[14.5px] font-medium">
                    {booking.offer_title}
                    {booking.quantity > 1 ? ` · ×${booking.quantity}` : ""}
                  </p>
                  <p className="text-ink-muted text-[12.5px]">{formatWhen(booking)}</p>
                </div>
                <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
