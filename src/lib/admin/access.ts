import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Platform administration: who may open /admin, and how impersonation is
 * carried between requests.
 *
 * Admin status is a row in platform_admins, checked against the database on
 * every request — never a claim carried in a cookie. The impersonation cookie
 * (./impersonation) only says *which coach* an admin is looking at; it grants
 * nothing on its own, because this check is redone server-side each time.
 */

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

/**
 * Guard for every /admin page. Answers 404 rather than redirecting: someone
 * who is not an admin learns nothing about the console existing.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (!(await isPlatformAdmin())) notFound();
  return user;
}

/** Server action guard: throws instead of rendering. */
export async function requireAdminForAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");
  if (!(await isPlatformAdmin())) throw new Error("forbidden");
  return user;
}
