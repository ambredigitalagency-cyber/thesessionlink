import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireOnboardedProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { beginOnboarding } from "@/lib/payments/accounts";
import { PAYMENT_PROVIDERS, providerConfigured, type PaymentProvider } from "@/lib/payments/config";
import { createPaypalReferral } from "@/lib/payments/paypal";
import { stripeAuthorizeUrl } from "@/lib/payments/stripe";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Sends the signed-in coach to a provider to connect their own account.
 *
 * The reference we store on the row and hand to the provider is a random
 * secret: it identifies the attempt on the way back, and because only this
 * route (behind the coach's session) can mint one, a callback carrying a valid
 * reference is a callback that coach started. That is what stops someone from
 * luring a coach into a link that attaches *their* payout account to it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const profile = await requireOnboardedProfile();
  const { provider: raw } = await params;

  if (!(PAYMENT_PROVIDERS as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }
  const provider = raw as PaymentProvider;

  const back = absoluteUrl("/dashboard/settings", siteUrl);
  if (!providerConfigured(provider)) {
    return NextResponse.redirect(`${back}?payments=not_configured`);
  }

  const reference = randomBytes(24).toString("base64url");
  if (!(await beginOnboarding(profile.id, provider, reference))) {
    return NextResponse.redirect(`${back}?payments=error`);
  }

  const callback = absoluteUrl(`/api/payments/callback/${provider}`, siteUrl);

  if (provider === "stripe") {
    return NextResponse.redirect(stripeAuthorizeUrl(reference, callback, profile.contact_email));
  }

  const referral = await createPaypalReferral(
    reference,
    `${callback}?ref=${reference}`,
    profile.contact_email,
  );

  return NextResponse.redirect(referral ?? `${back}?payments=error`);
}
