"use client";

import { useTranslations } from "next-intl";

import { fieldSummary } from "@/lib/offers/fields";
import { cn, formatPrice } from "@/lib/utils";

import type { PublicOffer } from "./types";

export function OfferPrice({
  offer,
  currency,
  locale,
  className,
}: {
  offer: PublicOffer;
  currency: string;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const price = formatPrice(offer.price, currency, locale, offer.price_type);
  // A message with no price is just a way to write: "on request" would
  // suggest a price exists somewhere. Nothing is shown.
  if (offer.action_type === "contact_request" && price.type === "on_request") return null;

  return (
    <span className={cn("text-ink text-[15px] font-semibold", className)}>
      {price.type === "free"
        ? t("free")
        : price.type === "on_request"
          ? t("onRequest")
          : price.type === "from"
            ? t("from", { price: price.amount ?? "" })
            : price.amount}
    </span>
  );
}

/**
 * Chips summarising an offer: its first custom fields, formatted in the
 * visitor's language (`fieldLocale`).
 */
export function offerChips(offer: PublicOffer, fieldLocale: string): string[] {
  const chips: string[] = [];

  for (const field of offer.custom_fields) {
    const summary = fieldSummary(field, fieldLocale);
    if (summary) chips.push(summary);
    if (chips.length >= 4) break;
  }

  return chips;
}
