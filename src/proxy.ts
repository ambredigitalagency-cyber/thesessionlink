import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { legalPathLocale } from "@/content/legal/types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { URL_LOCALE_HEADER } from "@/lib/i18n/config";

/**
 * Keeps the Supabase session fresh and guards the private areas.
 * Only runs on authenticated routes — public profiles stay free of auth work.
 *
 * Authorization is *always* re-checked inside server actions and loaders:
 * this is a fast path, not the security boundary.
 *
 * It also runs on the legal pages, only to pass on the language their URL
 * fixes: the root layout cannot read the path, and would otherwise take the
 * cookie's language for `<html lang>`.
 */
export async function proxy(request: NextRequest) {
  const urlLocale = legalPathLocale(request.nextUrl.pathname);
  if (urlLocale) {
    const headers = new Headers(request.headers);
    headers.set(URL_LOCALE_HEADER, urlLocale);
    return NextResponse.next({ request: { headers } });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    // Must match LEGAL_PATHS: a matcher has to be a literal.
    "/mentions-legales",
    "/legal",
    "/cgu",
    "/terms",
    "/confidentialite",
    "/privacy",
  ],
};
