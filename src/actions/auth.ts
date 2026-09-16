"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sendMagicLinkEmail } from "@/lib/emails/send";
import { serverEnv, siteUrl } from "@/lib/env";
import { toLocale } from "@/lib/i18n/config";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";

const magicLinkSchema = z.object({
  email: z
    .email("invalid_email")
    .max(160)
    .transform((value) => value.toLowerCase().trim()),
  next: z.string().nullish(),
  locale: z.string().nullish(),
});

/**
 * Sends a sign-in link.
 *
 * When a service key + Resend are configured we generate the link ourselves so
 * the email matches the product design and works cross-device. Otherwise we
 * fall back to Supabase's own email (the local dev path: links land in Mailpit).
 */
export async function requestMagicLink(input: {
  email: string;
  next?: string | null;
  locale?: string | null;
}): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }

  const { email } = parsed.data;
  const locale = toLocale(parsed.data.locale);
  const next = safeNextPath(parsed.data.next);
  const hasServiceKey = Boolean(serverEnv.supabaseSecretKey);

  if (hasServiceKey) {
    const admin = createSupabaseAdminClient();

    const { data: allowed, error: limitError } = await admin.rpc("check_rate_limit", {
      p_bucket: `magic_link:${email}`,
      p_limit: 5,
      p_window: "00:15:00",
    });

    if (!limitError && allowed === false) {
      return { ok: false, error: "too_many_requests" };
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(next)}`, siteUrl),
      },
    });

    if (error || !data.properties) {
      console.error("[auth] generateLink failed", error);
      return { ok: false, error: "send_failed" };
    }

    const url = absoluteUrl(
      `/auth/confirm?token_hash=${data.properties.hashed_token}` +
        `&type=${data.properties.verification_type}&next=${encodeURIComponent(next)}`,
      siteUrl,
    );

    const result = await sendMagicLinkEmail({ to: email, url, locale });
    if (!result.ok) return { ok: false, error: "send_failed" };

    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(next)}`, siteUrl),
    },
  });

  if (error) {
    console.error("[auth] signInWithOtp failed", error);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
