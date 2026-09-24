import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";

import { serverEnv } from "@/lib/env";

/**
 * The cookie that carries "this admin is looking at that coach".
 *
 * Kept apart from the admin check itself so the session layer can read it
 * without importing the admin module, and signed so it cannot be forged: the
 * value is useless to anyone who is not already a platform admin, since the
 * membership check runs again on every request.
 */

const IMPERSONATION_COOKIE = "tsl_impersonate";

function signature(profileId: string): string {
  return createHmac("sha256", serverEnv.supabaseSecretKey)
    .update(`impersonate:${profileId}`)
    .digest("base64url");
}

function verify(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const profileId = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(signature(profileId));

  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? profileId : null;
}

export async function startImpersonation(profileId: string) {
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, `${profileId}.${signature(profileId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Long enough to look into a problem, short enough to expire on its own.
    maxAge: 60 * 60,
  });
}

export async function clearImpersonation() {
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);
}

/** The profile an admin asked to look at, or null. Signature checked. */
export const impersonationTarget = cache(async (): Promise<string | null> => {
  const store = await cookies();
  const raw = store.get(IMPERSONATION_COOKIE)?.value;
  return raw ? verify(raw) : null;
});
