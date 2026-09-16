import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;

/** The signed-in user, verified against Supabase Auth. Deduped per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  return data ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Dashboard guard: onboarding cannot be skipped, so a pro without a finished
 * profile (i.e. without a first offer) is always sent back to it.
 */
export async function requireOnboardedProfile(): Promise<Profile> {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");
  return profile;
}

/** Server action guard: throws instead of redirecting. */
export async function requireProfileForAction(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("no_profile");
  return profile;
}
