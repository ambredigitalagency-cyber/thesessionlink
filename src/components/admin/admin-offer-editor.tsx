"use client";

import { useRouter } from "next/navigation";

import { OfferForm, type OfferInitialValues } from "@/components/offers/offer-form";
import type { CategoryField } from "@/lib/offers/schema";
import type { ActionResult } from "@/lib/validation";

/**
 * The coach's own offer editor, driven from the console: same fields, same
 * validation, but saved through the audited admin intervention and never
 * touching the photos. Back to the coach's file once saved.
 */
export function AdminOfferEditor({
  coachId,
  save,
  categoryFields,
  currency,
  locale,
  profileWhatsapp,
  gatewayReady,
  initial,
}: {
  coachId: string;
  save: (payload: Record<string, unknown>) => Promise<ActionResult<unknown>>;
  categoryFields: CategoryField[];
  currency: string;
  locale: string;
  profileWhatsapp: string | null;
  gatewayReady: boolean;
  initial: OfferInitialValues;
}) {
  const router = useRouter();
  const back = `/admin/coaches/${coachId}`;

  return (
    <OfferForm
      mode="edit"
      layout="sections"
      categoryFields={categoryFields}
      currency={currency}
      locale={locale}
      profileWhatsapp={profileWhatsapp}
      gatewayReady={gatewayReady}
      initial={initial}
      save={save}
      photosEditable={false}
      onSaved={() => {
        router.push(back);
        router.refresh();
      }}
      onCancel={() => router.push(back)}
    />
  );
}
