"use client";

import { useRouter } from "next/navigation";

import { OfferForm, type OfferInitialValues } from "@/components/offers/offer-form";
import type { ActionType, CategoryField } from "@/lib/offers/schema";

/** Dashboard wrapper: both steps at once, then back to the list. */
export function DashboardOfferForm({
  mode,
  categoryFields,
  suggestedActionType,
  currency,
  locale,
  profileWhatsapp,
  initial,
}: {
  mode: "create" | "edit";
  categoryFields: CategoryField[];
  suggestedActionType?: ActionType | null;
  currency: string;
  locale: string;
  profileWhatsapp: string | null;
  initial?: OfferInitialValues;
}) {
  const router = useRouter();

  return (
    <OfferForm
      mode={mode}
      layout="stacked"
      categoryFields={categoryFields}
      suggestedActionType={suggestedActionType}
      currency={currency}
      locale={locale}
      profileWhatsapp={profileWhatsapp}
      initial={initial}
      onSaved={() => {
        router.push("/dashboard/offers");
        router.refresh();
      }}
      onCancel={() => router.push("/dashboard/offers")}
    />
  );
}
