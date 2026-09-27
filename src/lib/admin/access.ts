import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { hasPasswordAccess, passwordAccessEnabled } from "./password-access";

/**
 * Platform administration: who may open /admin.
 *
 * Two doors, checked on every request:
 *
 *   * a platform admin — a row in platform_admins for the signed-in Supabase
 *     user. Never a claim carried in a cookie. This is the real system, and
 *     everything the console does through it is allowed by a named RLS policy.
 *   * the console password (./password-access.ts) — solo/demo use, no
 *     identity. It has no Supabase session for RLS to recognise, so it works
 *     through the service-role client instead; that is why every console page
 *     and action gets its client from `adminDb(actor)` rather than building one.
 *
 * The impersonation cookie (./impersonation) only says *which coach* a member
 * admin is looking at; it grants nothing on its own.
 */

export type AdminActor = { kind: "member"; userId: string; email: string } | { kind: "password" };

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
});

/** Whoever may use the console on this request, or null. Member first. */
export const currentAdmin = cache(async (): Promise<AdminActor | null> => {
  const user = await getCurrentUser();
  if (user && (await isPlatformAdmin())) {
    return { kind: "member", userId: user.id, email: user.email ?? "" };
  }
  if (await hasPasswordAccess()) return { kind: "password" };
  return null;
});

/**
 * The database client for a console request.
 *
 * A member keeps working through their own session, so RLS still decides what
 * they reach. Password access has no session, so it gets the service role —
 * which is exactly why it is solo/demo only.
 */
export async function adminDb(actor: AdminActor) {
  return actor.kind === "member" ? await createSupabaseServerClient() : createSupabaseAdminClient();
}

/**
 * Guard for every /admin page.
 *
 * A visitor who is not signed in at all goes to the password screen when that
 * door exists, and to the coach sign-in otherwise. A signed-in coach who is not
 * an admin gets a 404: nothing tells them there is a console here.
 */
export async function requireAdmin(): Promise<AdminActor> {
  const actor = await currentAdmin();
  if (actor) return actor;

  if (!(await getCurrentUser())) {
    redirect(passwordAccessEnabled() ? "/admin/login" : "/login?next=/admin");
  }
  notFound();
}

/** Server action guard: throws instead of rendering. */
export async function requireAdminForAction(): Promise<AdminActor> {
  const actor = await currentAdmin();
  if (!actor) throw new Error("forbidden");
  return actor;
}
