import { redirect } from "next/navigation";

import { getCurrentProfile, requireUser } from "@/lib/auth";

/**
 * Sends the pro to the step they still have to complete.
 *
 * Onboarding is the profile and nothing else: the first offer is created from
 * the dashboard, which invites to it without making it a gate.
 */
export default async function OnboardingRouter() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (profile?.onboarding_completed_at) redirect("/dashboard");
  redirect("/onboarding/profile");
}
