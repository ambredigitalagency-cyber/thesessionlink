"use server";

import { getCurrentUser, requireProfileForAction } from "@/lib/auth";
import {
  PaddleError,
  createSubscriptionTransaction,
  ensurePaddleCustomer,
  paddleConfigured,
  paddleFetch,
} from "@/lib/billing/paddle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/validation";

/**
 * The coach's side of the Paddle subscription.
 *
 * Both actions work for the signed-in coach only, and both write Paddle ids
 * with the service role: billing columns are read-only to a coach's own
 * session (see the profiles_guard_billing trigger).
 */

/** Prepares a checkout: the Paddle customer, and a transaction bound to this profile. */
export async function startSubscriptionCheckout(): Promise<
  ActionResult<{ transactionId: string }>
> {
  if (!paddleConfigured()) return { ok: false, error: "billing_unavailable" };
  const profile = await requireProfileForAction();
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, error: "unauthenticated" };
  if (profile.subscription_active && profile.paddle_subscription_id) {
    return { ok: false, error: "already_subscribed" };
  }

  try {
    const customerId = await ensurePaddleCustomer({
      existingId: profile.paddle_customer_id,
      email: user.email,
      name: profile.display_name,
    });
    if (customerId !== profile.paddle_customer_id) {
      await createSupabaseAdminClient()
        .from("profiles")
        .update({ paddle_customer_id: customerId })
        .eq("id", profile.id);
    }
    const transactionId = await createSubscriptionTransaction({
      customerId,
      profileId: profile.id,
    });
    return { ok: true, data: { transactionId } };
  } catch (error) {
    console.error(
      "[paddle] checkout preparation failed",
      error instanceof PaddleError ? error.message : error,
    );
    return { ok: false, error: "billing_unavailable" };
  }
}

/**
 * A short-lived link to Paddle's customer portal, where the coach changes the
 * card, downloads invoices or cancels. Paddle signs the link for this customer.
 */
export async function openBillingPortal(): Promise<ActionResult<{ url: string }>> {
  if (!paddleConfigured()) return { ok: false, error: "billing_unavailable" };
  const profile = await requireProfileForAction();
  if (!profile.paddle_customer_id) return { ok: false, error: "not_found" };

  try {
    const session = await paddleFetch<{ urls: { general: { overview: string } } }>(
      `/customers/${profile.paddle_customer_id}/portal-sessions`,
      {
        method: "POST",
        body: profile.paddle_subscription_id
          ? { subscription_ids: [profile.paddle_subscription_id] }
          : {},
      },
    );
    return { ok: true, data: { url: session.urls.general.overview } };
  } catch (error) {
    console.error(
      "[paddle] portal session failed",
      error instanceof PaddleError ? error.message : error,
    );
    return { ok: false, error: "billing_unavailable" };
  }
}
