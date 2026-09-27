import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { serverEnv } from "@/lib/env";

import {
  ACCESS_TTL_SECONDS,
  MIN_PASSWORD_LENGTH,
  accessTokenIsValid,
  issueAccessToken,
} from "./password-token";

/**
 * Password access to the platform console — FOR SOLO / DEMO USE ONLY.
 *
 * One shared password (ADMIN_ACCESS_PASSWORD) opens /admin for whoever knows
 * it, without a Supabase account. It exists so the person running the product
 * can reach the console while there is no admin account to sign in with. It is
 * not a multi-admin system and must not become one:
 *
 *   * there is no identity behind it — the journal and the notes record the
 *     action as "via password", never who did it;
 *   * everyone who has the password is the same person to the product;
 *   * revoking one holder means changing the password, which logs everyone out.
 *
 * The real system stays platform_admins + a Supabase session (./access.ts).
 * Both are accepted in parallel; this one never grants anything outside
 * /admin, and it cannot impersonate a coach (impersonation reads the coach's
 * dashboard through the admin's own Supabase session).
 *
 * The password never leaves the server: it is compared here, never logged,
 * never sent to the client. The cookie only carries a signed expiry
 * (./password-token.ts).
 */

const COOKIE = "tsl_console";
const COOKIE_PATH = "/admin";

/** Off unless a password of a reasonable length and the server secret exist. */
export function passwordAccessEnabled(): boolean {
  return (
    serverEnv.adminAccessPassword.length >= MIN_PASSWORD_LENGTH &&
    Boolean(serverEnv.supabaseSecretKey)
  );
}

export const hasPasswordAccess = cache(async (): Promise<boolean> => {
  if (!passwordAccessEnabled()) return false;
  const store = await cookies();
  return accessTokenIsValid(
    store.get(COOKIE)?.value,
    serverEnv.adminAccessPassword,
    serverEnv.supabaseSecretKey,
  );
});

export async function grantPasswordAccess() {
  const { value } = issueAccessToken(serverEnv.adminAccessPassword, serverEnv.supabaseSecretKey);
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export async function revokePasswordAccess() {
  const store = await cookies();
  store.delete({ name: COOKIE, path: COOKIE_PATH });
}
