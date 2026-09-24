import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "@/lib/env";
import { saveConnectedAccount } from "@/lib/payments/accounts";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/lib/payments/config";
import { paypalSellerFacts } from "@/lib/payments/paypal";
import { exchangeStripeCode } from "@/lib/payments/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Where the coach lands after connecting, with the outcome in the URL. */
function settings(outcome: string) {
  return NextResponse.redirect(
    `${absoluteUrl("/dashboard/settings", siteUrl)}?payments=${outcome}`,
  );
}

/**
 * The trip back from Stripe or PayPal.
 *
 * The reference decides which profile this is about — it was minted behind the
 * coach's session in the connect route and stored on the row. No session is
 * read here: a coach may well finish onboarding in another browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  if (!(PAYMENT_PROVIDERS as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }
  const provider = raw as PaymentProvider;

  const query = request.nextUrl.searchParams;
  // Stripe returns it as `state`, PayPal as the `ref` we put in the return URL.
  const reference = query.get("state") ?? query.get("ref");

  if (query.get("error")) return settings("declined");
  if (!reference) return settings("error");

  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from("payment_accounts")
    .select("profile_id, provider")
    .eq("onboarding_ref", reference)
    .eq("provider", provider)
    .maybeSingle();

  if (!row) return settings("error");

  if (provider === "stripe") {
    const code = query.get("code");
    if (!code) return settings("declined");

    const facts = await exchangeStripeCode(code);
    if (!facts) return settings("error");

    await saveConnectedAccount(row.profile_id, "stripe", facts);
    return settings(facts.chargesEnabled ? "connected" : "pending");
  }

  // PayPal hands the buyer back as soon as they finish the form; whether the
  // account can actually receive money is a separate question, and the answer
  // can arrive minutes later through MERCHANT.ONBOARDING.COMPLETED.
  const facts = await paypalSellerFacts(reference);
  if (!facts) return settings("pending");

  await saveConnectedAccount(row.profile_id, "paypal", facts);
  return settings(facts.chargesEnabled ? "connected" : "pending");
}
