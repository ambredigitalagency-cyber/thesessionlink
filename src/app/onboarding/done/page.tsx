import { redirect } from "next/navigation";

import { DoneScreen } from "@/components/onboarding/done-screen";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { loadPagePreview } from "@/lib/page/preview";
import { getTheme } from "@/lib/page/themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackingUrl } from "@/lib/tracking/qr";
import { absoluteUrl } from "@/lib/utils";

/**
 * "Your page is live": the last screen of the sign-up, reached from the look.
 * Never a redirect target — the router sends finished accounts to the
 * dashboard — but safe to reload: it only needs a published page.
 */
export default async function OnboardingDonePage() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const preview = await loadPagePreview(supabase, profile);
  const base = siteUrl;

  return (
    <DoneScreen
      preview={preview}
      url={absoluteUrl(`/${profile.slug}`, base)}
      instagramUrl={trackingUrl(base, profile.slug, "instagram")}
      slug={profile.slug}
      theme={getTheme(profile.theme).id}
      accent={profile.accent_color}
    />
  );
}
