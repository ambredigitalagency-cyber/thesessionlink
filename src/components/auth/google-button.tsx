"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { absoluteUrl } from "@/lib/utils";

/**
 * Google's brand terms require the four-colour mark rather than a monochrome
 * glyph, so this one icon opts out of the lucide stroke style used elsewhere.
 */
function GoogleMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
      />
    </svg>
  );
}

/**
 * Google sign-in, offered alongside the magic link rather than instead of it.
 *
 * Both routes land on `/auth/callback`: `signInWithOAuth` returns a PKCE code
 * there, exactly like Supabase's own magic-link email, so the callback keeps a
 * single exchange and a single redirect.
 */
export function GoogleButton({ next, oauthError }: { next: string; oauthError?: boolean }) {
  const t = useTranslations("auth");
  const tError = useTranslations("errors");

  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(Boolean(oauthError));

  async function signIn() {
    setFailed(false);
    setPending(true);

    const { error: failure } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(next)}`, siteUrl),
      },
    });

    // On success the browser has already left for Google: we only resume here
    // when the request itself failed.
    if (failure) {
      console.error("[auth] signInWithOAuth failed", failure);
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-7">
      <Button type="button" variant="secondary" size="lg" block loading={pending} onClick={signIn}>
        <GoogleMark className="size-[18px]" />
        {t("google")}
      </Button>

      {failed ? (
        <p className="text-danger mt-2 text-center text-[13px]">{tError("oauth_failed")}</p>
      ) : null}

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="bg-line h-px flex-1" />
        <span className="text-ink-subtle text-[12px]">{t("orDivider")}</span>
        <span className="bg-line h-px flex-1" />
      </div>
    </div>
  );
}
