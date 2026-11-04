"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { accessState } from "@/lib/billing/access";
import { sendRequestAcknowledgement, sendRequestToPro } from "@/lib/emails/send";
import { parseActionConfig } from "@/lib/offers/schema";
import { recordEvent } from "@/lib/tracking/record";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { fieldErrorsFrom, publicRequestSchema, type ActionResult } from "@/lib/validation";

async function rateLimit(bucket: string, limit: number, window: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window: window,
  });
  // Fail open on infrastructure errors: never block a real request.
  return error ? true : data !== false;
}

/**
 * Sends a message or a quote request from a public offer to the coach.
 *
 * Nothing is stored: the request is the email. That is also why the email to
 * the coach is sent before answering, and its failure is reported to the
 * visitor — a request that never reached anyone must not look sent. The
 * visitor's own copy goes out afterwards and may fail quietly.
 *
 * Runs with the service key because anonymous visitors cannot read the
 * coach's private address.
 */
export async function sendPublicRequest(input: unknown): Promise<ActionResult> {
  const parsed = publicRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const values = parsed.data;
  if (values.company) {
    // Honeypot filled: pretend nothing happened, send nothing.
    return { ok: false, error: "invalid_input" };
  }

  const supabase = createSupabaseAdminClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", values.offer_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!offer || offer.action_type === "whatsapp_direct") {
    return { ok: false, error: "offer_unavailable" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", offer.profile_id)
    .not("onboarding_completed_at", "is", null)
    // A suspended coach — or one on their way out — takes no requests,
    // whatever link is still circulating.
    .is("suspended_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile) return { ok: false, error: "offer_unavailable" };
  // A page offline for want of a subscription takes no requests either.
  if (accessState(profile, new Date()) === "expired") {
    return { ok: false, error: "offer_unavailable" };
  }

  const config = parseActionConfig(offer.action_type, offer.action_config);
  if (config.ask_phone === "required" && !values.client_phone) {
    return { ok: false, error: "invalid_input", fieldErrors: { client_phone: "required" } };
  }

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";

  const [emailAllowed, ipAllowed] = await Promise.all([
    rateLimit(`request:${profile.id}:${values.client_email}`, 5, "01:00:00"),
    rateLimit(`request_ip:${ip}`, 20, "01:00:00"),
  ]);

  if (!emailAllowed || !ipAllowed) {
    return { ok: false, error: "too_many_requests" };
  }

  const quote =
    offer.action_type === "quote_request"
      ? parseActionConfig("quote_request", offer.action_config)
      : null;

  const request = {
    offerTitle: offer.title,
    clientName: values.client_name,
    clientEmail: values.client_email,
    clientPhone: values.client_phone,
    message: values.message,
    requestedDate: quote?.ask_preferred_date ? (values.requested_date ?? null) : null,
    budget: quote?.ask_budget ? (values.budget ?? null) : null,
    locale: values.locale,
  };

  const proEmail = await resolveProEmail(profile);
  if (!proEmail) {
    console.error("[request] no address for profile", profile.id);
    return { ok: false, error: "unexpected" };
  }

  const sent = await sendRequestToPro({ request, profile, to: proEmail });
  if (!sent.ok) return { ok: false, error: "unexpected" };

  const requestHeaders = new Headers(headerList);
  after(async () => {
    await sendRequestAcknowledgement({ request, profile });
    // The request reached the coach: that is a contact, counted on the server
    // where it actually happened, never trusted from the browser.
    await recordEvent({
      headers: requestHeaders,
      profileId: profile.id,
      type: "contact",
      contactKind: offer.action_type === "quote_request" ? "quote" : "message",
      blockId: values.block_id ?? null,
      src: values.src,
      referrer: values.referrer,
    });
  });

  return { ok: true };
}

async function resolveProEmail(profile: Tables<"profiles">) {
  if (profile.contact_email) return profile.contact_email;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.auth.admin.getUserById(profile.user_id);
  return data.user?.email ?? null;
}
