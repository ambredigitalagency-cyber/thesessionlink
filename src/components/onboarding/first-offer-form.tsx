"use client";

import { useRouter } from "next/navigation";

import { OfferForm } from "@/components/offers/offer-form";
import { OnboardingSteps } from "@/components/onboarding/steps";
import type { ActionType, CategoryField } from "@/lib/offers/schema";

/**
 * The offer builder, inside onboarding.
 *
 * The wizard hands its progress back rather than drawing it: here it is step 3
 * of four, so the bar that belongs on screen is the onboarding one, moving a
 * sixth of that step per question answered. Its own four-stage bar would sit
 * directly under this one and say something almost, but not quite, the same.
 *
 * The questions are level-1 headings for the same reason: this step has no
 * page title above them, so the question *is* the title of the screen.
 */
export function FirstOfferForm(props: {
  categoryFields: CategoryField[];
  suggestedActionType: ActionType;
  currency: string;
  locale: string;
  profileWhatsapp: string | null;
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
      headingLevel={1}
      progress={(ratio) => <OnboardingSteps current={3} advance={ratio} />}
      onSaved={() => router.push("/onboarding/share")}
    />
  );
}
