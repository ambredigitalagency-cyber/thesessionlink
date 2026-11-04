"use client";

import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { chromeIntentUrl, type InAppBrowser } from "@/lib/auth/in-app-browser";

const APP_NAMES: Record<InAppBrowser["app"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
};

export function appName(browser: InAppBrowser) {
  return APP_NAMES[browser.app];
}

/**
 * Shown on the sign-in page inside an app's own browser. The email link is
 * the way in from here (the form just below); this explains why Google is
 * not, and offers the way out to the phone's real browser: Chrome directly
 * on Android, and on any phone the page's link to paste, with where the
 * app's menu hides its "open in browser" item.
 */
export function InAppNotice({ browser, pageUrl }: { browser: InAppBrowser; pageUrl: string }) {
  const t = useTranslations("auth.inApp");
  const [copied, setCopied] = useState(false);
  const app = appName(browser);
  const intent = browser.os === "android" ? chromeIntentUrl(pageUrl) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
    } catch {
      // Some in-app browsers refuse the clipboard: the menu route remains.
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="in-app-title"
      className="rise-in mt-6 rounded-[var(--radius-md)] bg-[var(--accent-soft)] p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-[var(--accent-ink)]">
          <Smartphone className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="in-app-title" className="text-ink text-[14.5px] font-semibold">
            {t("title", { app })}
          </h2>
          <p className="text-ink-muted mt-1 text-[13.5px] leading-relaxed">{t("body")}</p>
        </div>
      </div>

      <details className="group mt-3">
        <summary className="text-ink cursor-pointer text-[13px] font-medium underline underline-offset-4">
          {t("open")}
        </summary>
        <div className="mt-3 space-y-3">
          {intent ? (
            <Button asChild size="sm">
              <a href={intent}>
                <ExternalLink className="size-3.5" aria-hidden />
                {t("openChrome")}
              </a>
            </Button>
          ) : null}
          <p className="text-ink-muted text-[13px] leading-relaxed">
            {browser.os === "ios"
              ? t("howIos")
              : browser.os === "android"
                ? t("howAndroid")
                : t("howOther")}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {t("copy")}
          </Button>
          <p aria-live="polite" className="text-success text-[12.5px]">
            {copied ? t("copied") : ""}
          </p>
        </div>
      </details>
    </section>
  );
}
