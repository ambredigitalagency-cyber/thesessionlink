import { redirect } from "next/navigation";

import { getCurrentProfile, requireUser } from "@/lib/auth";

/**
 * Sends the pro to the part they still have to complete.
 *
 *   * no profile yet → part 1, the identity (activity, name, link);
 *   * a profile but no offer → part 2, the first offer: the link is reserved
 *     and its page says it is being set up until that offer is published;
 *   * onboarding complete → the dashboard, always. The first offer stamps it
 *     (and the earlier, profile-first flow did too), so an account that
 *     finished either way is never walked back through this.
 *
 * The finishing touches and the share screen (parts 3 and 4) follow the offer
 * directly in the browser; they are never a redirect target.
 */
export default async function OnboardingRouter() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) redirect("/onboarding/profile");
  if (profile.onboarding_completed_at) redirect("/dashboard");
  redirect("/onboarding/offer");
}
