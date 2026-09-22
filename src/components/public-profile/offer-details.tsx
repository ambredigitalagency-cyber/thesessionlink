"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/primitives";
import {
  formatNumber,
  formatTimeValue,
  optionLabels,
  visibleFields,
  type OfferField,
} from "@/lib/offers/fields";

/**
 * An offer's custom fields as clients see them, in the order the pro set.
 * Each type renders in its own way: prose for long text, badges for choices, a
 * check or a cross for yes/no. Photo fields are left out — they join the offer
 * gallery (see galleryPhotos() in lib/offers/fields).
 *
 * Shared by the public offer sheet and the review step of the offer builder,
 * so what the pro previews is exactly what gets published.
 *
 * Numbers, times and durations are formatted in the reader's language (the
 * locale of the surrounding page), not the pro's: a visitor reading in English
 * gets "9:00 AM" even on a French profile.
 */
export function OfferDetails({ fields }: { fields: OfferField[] }) {
  const locale = useLocale();
  const details = visibleFields(fields).filter((field) => field.type !== "images");
  if (details.length === 0) return null;

  return (
    <dl className="divide-line border-line divide-y border-y">
      {details.map((field) =>
        field.type === "text" && field.definition.multiline ? (
          <div key={field.id} className="space-y-1.5 py-3">
            <dt className="text-ink-muted text-[13.5px]">{field.definition.label}</dt>
            <dd className="text-ink text-[14.5px] leading-relaxed whitespace-pre-wrap">
              {field.value}
            </dd>
          </div>
        ) : (
          <div key={field.id} className="flex items-baseline justify-between gap-6 py-2.5">
            <dt className="text-ink-muted shrink-0 text-[13.5px]">{field.definition.label}</dt>
            <dd className="text-ink min-w-0 text-right text-[14px] font-medium">
              <FieldValue field={field} locale={locale} />
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}

function FieldValue({ field, locale }: { field: OfferField; locale: string }) {
  const t = useTranslations("common");

  switch (field.type) {
    case "select":
    case "multiselect":
      return (
        <span className="inline-flex flex-wrap justify-end gap-1.5">
          {optionLabels(field).map((label) => (
            <Badge key={label} tone="accent">
              {label}
            </Badge>
          ))}
        </span>
      );
    case "boolean":
      return field.value ? (
        <span className="text-success inline-flex items-center gap-1.5">
          <Check className="size-4" aria-hidden />
          {t("yes")}
        </span>
      ) : (
        <span className="text-ink-subtle inline-flex items-center gap-1.5">
          <X className="size-4" aria-hidden />
          {t("no")}
        </span>
      );
    case "number":
      return field.value === null ? null : formatNumber(field.value, locale, field.definition.unit);
    case "time":
      return formatTimeValue(field, locale);
    case "text":
      return field.value;
    default:
      return null;
  }
}
