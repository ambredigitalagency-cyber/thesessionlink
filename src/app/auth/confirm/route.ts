import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";

import { recordSignIn } from "@/lib/auth/record-sign-in";
import { LOCALE_COOKIE, toLocale } from "@/lib/i18n/config";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Uses the hashed token (not PKCE), so the link works in
 * whichever browser opens it — the phone's mail app hands it to Safari or
 * Chrome, not to the Instagram browser the sign-up started in, and that is
 * fine: the session is created where the link is opened.
 *
 * In two steps. Opening the link (GET) only shows a page that sends the token
 * back (POST), at once when scripts run, on a tap otherwise; the POST signs
 * in. A one-time token spent on a GET would be spent by the first thing that
 * fetches the link — the "safe links" scanners of many mail providers do,
 * before the person ever taps — and the coach would land on "this link has
 * already been used".
 */

const OTP_TYPES = new Set(["email", "magiclink", "signup", "invite", "recovery", "email_change"]);

function params(source: URLSearchParams | FormData) {
  const tokenHash = source.get("token_hash");
  const type = source.get("type");
  return {
    tokenHash:
      typeof tokenHash === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(tokenHash) ? tokenHash : null,
    type: typeof type === "string" && OTP_TYPES.has(type) ? (type as EmailOtpType) : null,
    next: safeNextPath(
      typeof source.get("next") === "string" ? (source.get("next") as string) : null,
    ),
  };
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export async function GET(request: NextRequest) {
  const { tokenHash, type, next } = params(request.nextUrl.searchParams);
  if (!tokenHash || !type)
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));

  const locale = toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const t = await getTranslations({ locale, namespace: "auth.confirm" });

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(t("title"))}</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#faf9f7;color:#0c0c0d;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
  main{padding:24px;text-align:center;max-width:22rem}
  h1{font-size:20px;letter-spacing:-.02em;margin:0 0 8px}
  p{color:#5b5b60;margin:0 0 20px;font-size:15px}
  button{font:inherit;font-weight:500;border:0;border-radius:999px;background:#0c0c0d;color:#fff;padding:12px 22px;cursor:pointer;min-height:44px}
  button:focus-visible{outline:3px solid #f2542d;outline-offset:3px}
</style>
</head>
<body>
<main>
  <h1>${escape(t("title"))}</h1>
  <p>${escape(t("body"))}</p>
  <form method="post" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escape(tokenHash)}">
    <input type="hidden" name="type" value="${escape(type)}">
    <input type="hidden" name="next" value="${escape(next)}">
    <button type="submit">${escape(t("button"))}</button>
  </form>
</main>
<script>document.forms[0].submit()</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // The token never leaves for another site; our own POST keeps its Origin.
      "referrer-policy": "same-origin",
    },
  });
}

export async function POST(request: NextRequest) {
  // Only our own confirmation page posts here: another site cannot sign a
  // visitor into an account of its choosing.
  // Some webviews send "Origin: null"; then the fetch metadata decides.
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const foreign =
    origin && origin !== "null"
      ? origin !== request.nextUrl.origin
      : site === "cross-site" || site === "same-site";
  if (foreign) {
    console.error("[auth] confirm refused: foreign origin", origin, site);
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url), 303);
  }

  const { tokenHash, type, next } = params(await request.formData());

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      await recordSignIn(data.session);
      // 303: the browser follows with a GET, never a second POST.
      return NextResponse.redirect(new URL(next, request.url), 303);
    }
    console.error("[auth] confirm failed", error.code, error.message);
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url), 303);
}
