"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  grantPasswordAccess,
  passwordAccessEnabled,
  revokePasswordAccess,
} from "@/lib/admin/password-access";
import { passwordMatches } from "@/lib/admin/password-token";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/validation";

/**
 * The console password door — solo/demo use, see lib/admin/password-access.ts.
 *
 * Attempts are rate-limited through the same check_rate_limit() the magic
 * link uses: five per address per quarter of an hour, and a ceiling across
 * all addresses so rotating IPs does not buy unlimited guesses. Every attempt
 * counts, right or wrong, so the limit also bounds how often the check runs.
 *
 * The password is compared on the server and goes nowhere else: not into a
 * log line, not into an error, not back to the client.
 */

const PER_ADDRESS = { limit: 5, window: "00:15:00" };
const OVERALL = { limit: 30, window: "01:00:00" };

async function clientAddress(): Promise<string> {
  const store = await headers();
  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    store.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function allowed(bucket: string, rule: { limit: number; window: string }) {
  const { data, error } = await createSupabaseAdminClient().rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: rule.limit,
    p_window: rule.window,
  });
  // Fail closed: if the limiter cannot answer, the door does not open.
  return !error && data === true;
}

export async function enterConsole(password: string): Promise<ActionResult> {
  if (!passwordAccessEnabled()) return { ok: false, error: "not_found" };
  if (typeof password !== "string" || password.length > 256) {
    return { ok: false, error: "invalid_password" };
  }

  const address = await clientAddress();
  if (
    !(await allowed(`console_login:${address}`, PER_ADDRESS)) ||
    !(await allowed("console_login:all", OVERALL))
  ) {
    return { ok: false, error: "too_many_requests" };
  }

  if (!passwordMatches(password, serverEnv.adminAccessPassword)) {
    console.warn("[admin] console password refused", { address });
    return { ok: false, error: "invalid_password" };
  }

  await grantPasswordAccess();
  return { ok: true };
}

export async function leaveConsole() {
  await revokePasswordAccess();
  redirect("/admin/login");
}
