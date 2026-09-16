import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** PKCE callback, used when Supabase sends its own default magic-link email. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect("/login?error=invalid_link");
}
