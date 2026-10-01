"use client";

import { useRouter } from "next/navigation";

import { OfferForm } from "@/components/offers/offer-form";
import { OnboardingSteps } from "@/components/onboarding/steps";
import type { ActionType, CategoryField } from "@/lib/offers/schema";
import type { WeeklyRule } from "@/lib/scheduling/weekly";

type Template = { category: string; fields: Partial<Record<ActionType, CategoryField[]>> };

/**
 * The offer builder, inside onboarding — part 2, right after the link.
 *
 * The wizard hands its progress back rather than drawing it: here it is one
 * step of a longer journey, so the bar on screen is the onboarding one, moving
 * a fraction of that step per question. Its own four-stage bar would sit
 * directly under it and say almost, but not quite, the same thing.
 *
 * The questions are level-1 headings: this step has no page title above
 * them, so the question *is* the title of the screen. A calendar offer adds
 * the weekly hours right after the action (see `hours` in OfferForm).
 *
 * Publishing it stamps onboarding_completed_at (offers_complete_onboarding):
 * the page is live with its offer, and the finishing touches come next.
 */
export function FirstOfferForm(props: {
  categoryFields: CategoryField[];
  template?: Template;
  suggestedActionType: ActionType;
  currency: string;
  locale: string;
  profileWhatsapp: string | null;
  savedHours: WeeklyRule[] | null;
}) {
  const router = useRouter();

  return (
    <OfferForm
      mode="create"
      layout="wizard"
      categoryFields={props.categoryFields}
      template={props.template}
      suggestedActionType={props.suggestedActionType}
      currency={props.currency}
      locale={props.locale}
      profileWhatsapp={props.profileWhatsapp}
      hours={{ saved: props.savedHours }}
      headingLevel={1}
      progress={(ratio) => <OnboardingSteps current={3} advance={ratio} />}
      onSaved={() => router.push("/onboarding/finish")}
    />
  );
}
