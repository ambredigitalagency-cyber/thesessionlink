import "server-only";

import type { Session } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { impersonationTarget } from "@/lib/admin/impersonation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { describeDevice, ipPrefix, methodFromAccessToken } from "./sign-in-record";

/**
 * Adds one row to coach_sign_ins after a successful sign-in, for the console's
 * history panel. Called by both auth routes right after the session exists.
 *
 * It never gets in the way of signing in: a failure is logged and swallowed,
 * because a missing history line is a small loss and a refused sign-in is not.
 */
export async function recordSignIn(session: Session | null | undefined) {
  if (!session?.user) return;
  if (await impersonationTarget()) return;

  try {
    const store = await headers();
    const { error } = await createSupabaseAdminClient()
      .from("coach_sign_ins")
      .insert({
        user_id: session.user.id,
        method: methodFromAccessToken(session.access_token),
        device: describeDevice(store.get("user-agent"))?.slice(0, 120) ?? null,
        ip_prefix: ipPrefix(store.get("x-forwarded-for") ?? store.get("x-real-ip")),
      });
    if (error) console.error("[auth] sign-in record failed", error.code);
  } catch (error) {
    console.error(
      "[auth] sign-in record failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}
