import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PKCE callback. Shared by Supabase's own magic-link email and by Google
 * sign-in: both come back with a `code`, so the exchange and the redirect stay
 * in one place. `next` defaults to `/onboarding`, which is the single router
 * deciding between the remaining steps and `/dashboard`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // The provider reports a refused consent (or its own failure) this way.
  if (searchParams.get("error")) redirect("/login?error=oauth_failed");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect("/login?error=invalid_link");
}
