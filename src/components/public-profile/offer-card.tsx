"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/primitives";
import { ACTION_ICONS, minutesToLabel } from "@/lib/offers/meta";
import { fieldSummary } from "@/lib/offers/fields";
import { parseActionConfig } from "@/lib/offers/schema";
import { cn, formatPrice } from "@/lib/utils";
import type { CardStyle } from "@/lib/validation";

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
 * Chips summarising an offer: duration, seats, and the first custom fields.
 * Custom fields are formatted in the visitor's language (`fieldLocale`); the
 * rest still follows the profile's, like the price.
 */
export function offerChips(offer: PublicOffer, locale: string, fieldLocale: string): string[] {
  const chips: string[] = [];

  if (offer.action_type === "calendar_booking") {
    const config = parseActionConfig("calendar_booking", offer.action_config);
    chips.push(minutesToLabel(config.duration_minutes, locale));
  }

  for (const field of offer.custom_fields) {
    const summary = fieldSummary(field, fieldLocale);
    if (summary) chips.push(summary);
    if (chips.length >= 4) break;
  }

  return chips;
}

/**
 * The three card styles a coach can pick (profiles.theme.cards). Only the
 * surface changes; content and hierarchy stay identical, so the choice is
 * about mood, never about what the client can find.
 */
const CARD_SURFACE: Record<CardStyle, string> = {
  outline:
    "border-line bg-surface hover:border-ink/15 border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)]",
  soft: "bg-surface border border-transparent shadow-[var(--shadow-float)] hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.28)]",
  accent:
    "border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)]",
};

export function OfferCard({
  offer,
  currency,
  locale,
  variant = "outline",
  onOpen,
}: {
  offer: PublicOffer;
  currency: string;
  locale: string;
  variant?: CardStyle;
  onOpen: () => void;
}) {
  const t = useTranslations("publicProfile");
  const tActions = useTranslations("offers.actions");
  const Icon = ACTION_ICONS[offer.action_type];
  const visitorLocale = useLocale();
  const chips = offerChips(offer, locale, visitorLocale);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group block w-full overflow-hidden rounded-[var(--radius-lg)] text-left transition-all duration-300 ease-[var(--ease-out-expo)] motion-safe:hover:-translate-y-0.5",
        CARD_SURFACE[variant],
      )}
    >
      {offer.main_photo_url ? (
        <div className="bg-ink/5 relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={offer.main_photo_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 560px"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
          />
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-ink text-[17px] leading-snug font-semibold tracking-[-0.02em]">
            {offer.title}
          </h3>
          <OfferPrice offer={offer} currency={currency} locale={locale} className="shrink-0" />
        </div>

        {offer.description ? (
          <p className="text-ink-muted mt-1.5 line-clamp-2 text-[14px] leading-relaxed">
            {offer.description}
          </p>
        ) : null}

        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip, index) => (
              <Badge key={index} tone="neutral">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-ink-subtle inline-flex items-center gap-1.5 text-[12.5px]">
            <Icon className="size-3.5" />
            {tActions(`${offer.action_type}.label`)}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              // On a tinted card a tinted pill would vanish: it starts solid.
              variant === "accent"
                ? "bg-[var(--accent)] text-[var(--accent-on)] group-hover:bg-[var(--accent-hover)]"
                : "bg-[var(--accent-soft)] text-[var(--accent-ink)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-on)]",
            )}
          >
            {t(`cta.${offer.action_type}` as "cta.calendar_booking")}
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
