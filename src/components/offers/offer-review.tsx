"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { OfferPrice } from "@/components/public-profile/offer-card";
import { OfferDetails } from "@/components/public-profile/offer-details";
import { OfferGallery } from "@/components/public-profile/offer-gallery";
import type { PublicOffer } from "@/components/public-profile/types";
import { Badge } from "@/components/ui/primitives";
import { isFieldFilled } from "@/lib/offers/fields";
import { ACTION_ICONS } from "@/lib/offers/meta";

import type { OfferStep } from "./offer-form";

export type ReviewDraft = Omit<PublicOffer, "id" | "main_photo_url">;

/**
 * Last step of the offer builder: a short checklist with a way back to each
 * step, then the offer exactly as clients will open it — rendered with the
 * public components themselves, not a lookalike.
 */
export function OfferReview({
  draft,
  currency,
  locale,
  onEdit,
}: {
  draft: ReviewDraft;
  currency: string;
  locale: string;
  onEdit: (step: OfferStep) => void;
}) {
  const t = useTranslations("offers.review");
  const tForm = useTranslations("offers.form");
  const tActions = useTranslations("offers.actions");

  const offer: PublicOffer = {
    ...draft,
    id: "preview",
    main_photo_url: draft.photos[0] ?? null,
  };
  const filled = draft.custom_fields.filter(isFieldFilled).length;
  const empty = draft.custom_fields.length - filled;
  const ActionIcon = ACTION_ICONS[draft.action_type];

  const rows: { step: OfferStep; summary: string }[] = [
    {
      step: "essentials",
      summary: `${draft.title} · ${tActions(`${draft.action_type}.label`)}`,
    },
    {
      step: "details",
      summary:
        draft.custom_fields.length === 0
          ? t("noFields")
          : t("fieldsSummary", { count: draft.custom_fields.length, filled }),
    },
    {
      step: "photos",
      summary:
        draft.photos.length === 0 ? t("noPhotos") : t("photos", { count: draft.photos.length }),
    },
  ];

  return (
    <div className="space-y-7">
      <ul className="divide-line border-line divide-y border-y">
        {rows.map((row) => (
          <li key={row.step} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-ink text-[13.5px] font-medium">{tForm(`steps.${row.step}`)}</p>
              <p className="text-ink-muted truncate text-[13px]">{row.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="text-ink-muted hover:text-ink hover:bg-ink/5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
            >
              <Pencil className="size-3.5" />
              {t("edit")}
            </button>
          </li>
        ))}
      </ul>

      {empty > 0 ? (
        <p className="text-ink-muted bg-ink/[0.03] rounded-[var(--radius-sm)] px-4 py-3 text-[13px]">
          {t("emptyFields", { count: empty })}
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-ink-subtle text-[12px] font-medium tracking-[0.08em] uppercase">
          {t("preview")}
        </p>
        <div className="border-line bg-surface space-y-5 rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-card)]">
          <div className="space-y-1.5">
            <h3 className="text-ink text-[18px] font-semibold tracking-[-0.01em]">{draft.title}</h3>
            <Badge tone="neutral">
              <ActionIcon className="size-3" />
              {tActions(`${draft.action_type}.label`)}
            </Badge>
          </div>

          <OfferGallery offer={offer} />

          <OfferPrice offer={offer} currency={currency} locale={locale} className="text-[20px]" />

          {draft.description ? (
            <p className="text-ink-muted text-[15px] leading-relaxed whitespace-pre-wrap">
              {draft.description}
            </p>
          ) : null}

          <OfferDetails fields={draft.custom_fields} />
        </div>
      </div>
    </div>
  );
}
