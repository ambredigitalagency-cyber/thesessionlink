import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { impersonationTarget } from "@/lib/admin/impersonation";
import { accessState, isLocked } from "@/lib/billing/access";
import { resolveStep, type Step } from "@/lib/onboarding/steps";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;

/** The signed-in user, verified against Supabase Auth. Deduped per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/**
 * The profile the dashboard renders for.
 *
 * Normally the signed-in coach. While a platform admin is impersonating, it is
 * the coach they asked to look at — but only after re-checking, here and on
 * every request, that the signed-in account really is an admin. The cookie on
 * its own proves nothing.
 *
 * Reads go through the admin's own session, so the "Platform admins read..."
 * policies decide what is visible; writes are not covered by those policies,
 * which is what keeps impersonation read-only.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const impersonated = await impersonationTarget();

  if (impersonated) {
    const { data: admin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (admin) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", impersonated)
        .maybeSingle();

      if (data) return data;
    }
  }

  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  return data ?? null;
});

/** The coach being impersonated right now, for the banner. */
export const getImpersonatedProfile = cache(async (): Promise<Profile | null> => {
  const target = await impersonationTarget();
  if (!target) return null;

  const profile = await getCurrentProfile();
  return profile && profile.id === target ? profile : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Where the signed-in account stands in the sign-up, from its data first and
 * its stored progress second (see resolveStep). Deduped per request.
 */
export const getOnboardingStep = cache(async (): Promise<Step> => {
  const user = await getCurrentUser();
  if (!user) return "category";

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: progress }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("onboarding_progress")
      .select("step, category_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return resolveStep({
    profile: profile ? { published: Boolean(profile.onboarding_completed_at) } : null,
    progress: progress ? { step: progress.step, categoryId: progress.category_id } : null,
  });
});

/**
 * Dashboard guard: the sign-up cannot be skipped, so an account that has not
 * finished it — no published page yet, or the look still to choose — is sent
 * back to the step it stopped at. An admin looking through a coach's account
 * is never sent anywhere: the step is the coach's, not theirs.
 */
export async function requireOnboardedProfile(): Promise<Profile> {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");
  if (!(await impersonationTarget()) && (await getOnboardingStep()) !== "done") {
    redirect("/onboarding");
  }
  // A suspended coach — or one who asked to leave — keeps their data and their
  // session, but not the tools. Both land on the same explanation page.
  if (profile.suspended_at || profile.deleted_at) redirect("/suspended");
  return profile;
}

/**
 * Server action guard: throws instead of redirecting.
 *
 * It is also the subscription gate: an account in grace or expired (see
 * src/lib/billing/access.ts) may no longer change anything — its page, its
 * offers, its sources, its settings. The only actions that pass
 * `allowLocked` are the ways out of that state (subscribing, the billing
 * portal); src/actions/guard.test.ts lists every action and fails when one is
 * neither guarded nor knowingly exempt. The database refuses the same writes
 * on its own (can_edit_own_page), so a request that skipped the app gets
 * nowhere either.
 *
 * Impersonation is where this earns its keep. An admin looking through a
 * coach's account may read, never write — the admin policies grant SELECT on
 * the coach's tables, but they also grant UPDATE on profiles, so without this
 * check the profile form would happily save under the coach's name. Every
 * coach-side write goes through here, so one refusal covers them all.
 *
 * An account awaiting deletion is frozen the same way: the session survives
 * until the next sign-out, and a tab left open must not keep writing.
 */
export async function requireProfileForAction(
  options: { allowLocked?: boolean } = {},
): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");
  if (await impersonationTarget()) throw new Error("impersonation_is_read_only");

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("no_profile");
  if (profile.deleted_at) throw new Error("account_pending_deletion");
  if (profile.suspended_at) throw new Error("account_suspended");
  if (!options.allowLocked && isLocked(accessState(profile, new Date()))) {
    throw new Error("subscription_required");
  }
  return profile;
}
