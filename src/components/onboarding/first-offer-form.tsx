"use client";

import { useRouter } from "next/navigation";

import { OfferForm } from "@/components/offers/offer-form";
import type { ActionType, CategoryField } from "@/lib/offers/schema";

export function FirstOfferForm(props: {
  categoryFields: CategoryField[];
  suggestedActionType: ActionType;
  currency: string;
  locale: string;
  profileWhatsapp: string | null;
  maxPhotos: number | null;
}) {
  const router = useRouter();

  return (
    <OfferForm
      mode="create"
      layout="wizard"
      categoryFields={props.categoryFields}
      suggestedActionType={props.suggestedActionType}
      currency={props.currency}
      locale={props.locale}
      profileWhatsapp={props.profileWhatsapp}
      maxPhotos={props.maxPhotos}
      onSaved={() => router.push("/onboarding/share")}
    />
  );
}
