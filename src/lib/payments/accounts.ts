import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { configuredProviders, type PaymentProvider } from "./config";
import type { ConnectedAccountFacts, PaymentAccount } from "./types";

/**
 * Reading and writing a coach's connected gateways.
 *
 * Reads go through the coach's own session, so the "Pros read their own
 * payment accounts" policy decides what comes back. Writes go through the
 * service key, because the only things allowed to connect an account are the
 * OAuth callbacks and the webhooks — never a form post.
 */

export type GatewayState = {
  provider: PaymentProvider;
  /** Usable on this deployment at all (credentials present). */
  available: boolean;
  status: "not_connected" | "pending" | "connected" | "disabled";
  /** Connected *and* allowed to take money. */
  ready: boolean;
  label: string | null;
  connectedAt: string | null;
};

export async function gatewayStates(profileId: string): Promise<GatewayState[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("payment_accounts").select("*").eq("profile_id", profileId);

  const available = new Set(configuredProviders());
  const rows = new Map((data ?? []).map((row) => [row.provider as PaymentProvider, row]));

  return (["stripe", "paypal"] as const).map((provider) => {
    const row = rows.get(provider);
    const details = (row?.details ?? {}) as { email?: unknown; business_name?: unknown };
    const label =
      typeof details.business_name === "string"
        ? details.business_name
        : typeof details.email === "string"
          ? details.email
          : null;

    return {
      provider,
      available: available.has(provider),
      status: (row?.status as GatewayState["status"]) ?? "not_connected",
      ready: Boolean(row && row.status === "connected" && row.charges_enabled),
      label,
      connectedAt: row?.connected_at ?? null,
    };
  });
}

/** The providers a client may actually be offered for this coach. */
export async function payableProviders(profileId: string): Promise<PaymentProvider[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("public_payment_options")
    .select("provider")
    .eq("profile_id", profileId);

  const configured = new Set(configuredProviders());
  return (data ?? [])
    .map((row) => row.provider as PaymentProvider)
    .filter((provider) => configured.has(provider));
}

/** Same question, from a context with no session (the booking action). */
export async function payableProvidersAsAdmin(profileId: string): Promise<PaymentProvider[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("payment_accounts")
    .select("provider, status, charges_enabled")
    .eq("profile_id", profileId);

  const configured = new Set(configuredProviders());
  return (data ?? [])
    .filter((row) => row.status === "connected" && row.charges_enabled)
    .map((row) => row.provider as PaymentProvider)
    .filter((provider) => configured.has(provider));
}

export async function accountFor(
  profileId: string,
  provider: PaymentProvider,
): Promise<PaymentAccount | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("payment_accounts")
    .select("*")
    .eq("profile_id", profileId)
    .eq("provider", provider)
    .maybeSingle();
  return data ?? null;
}

/** Opens a connection attempt and hands back the reference to carry along. */
export async function beginOnboarding(
  profileId: string,
  provider: PaymentProvider,
  onboardingRef: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("payment_accounts").upsert(
    {
      profile_id: profileId,
      provider,
      onboarding_ref: onboardingRef,
      status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
    },
    { onConflict: "profile_id,provider" },
  );

  if (error) console.error("[payments] begin onboarding failed", error.code, error.message);
  return !error;
}

export async function saveConnectedAccount(
  profileId: string,
  provider: PaymentProvider,
  facts: ConnectedAccountFacts,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("payment_accounts").upsert(
    {
      profile_id: profileId,
      provider,
      external_id: facts.externalId,
      status: "connected",
      charges_enabled: facts.chargesEnabled,
      payouts_enabled: facts.payoutsEnabled,
      details: facts.details as never,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,provider" },
  );

  if (error) console.error("[payments] save account failed", error.code, error.message);
  return !error;
}

/** Re-reads capabilities from a provider event, by the id it gave us. */
export async function refreshCapabilities(
  provider: PaymentProvider,
  facts: ConnectedAccountFacts,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("payment_accounts")
    .update({
      charges_enabled: facts.chargesEnabled,
      payouts_enabled: facts.payoutsEnabled,
      details: facts.details as never,
    })
    .eq("provider", provider)
    .eq("external_id", facts.externalId);
}

export async function disconnectAccount(
  profileId: string,
  provider: PaymentProvider,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("payment_accounts")
    .update({ status: "disabled", charges_enabled: false, payouts_enabled: false })
    .eq("profile_id", profileId)
    .eq("provider", provider);
}
