"use client";

import { ArrowRight, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { NoOffersArt } from "@/components/dashboard/empty-illustrations";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "tsl.first-offer-prompt.dismissed";

/**
 * The invitation to create a first offer, shown at the top of every dashboard
 * page while the coach has none.
 *
 * Onboarding no longer asks for an offer, so this is where the ask lives — and
 * it is an ask, not a gate. "Later" hides it for the rest of the browser
 * session; it comes back next time, because the public page is still showing
 * "being set up" until an offer exists. It stays out of the way on the offer
 * pages themselves, where it would only point at the screen already open.
 */
export function FirstOfferPrompt({ publicUrl }: { publicUrl: string }) {
  const t = useTranslations("dashboard.firstOffer");
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);

  if (dismissed || pathname.startsWith("/dashboard/offers")) return null;

  return (
    <section
      aria-labelledby="first-offer-title"
      className="rise-in surface-card relative mb-6 flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <NoOffersArt className="w-28 shrink-0 self-center sm:w-32" />

      <div className="min-w-0 flex-1">
        <p className="text-ink-subtle text-[11.5px] font-medium tracking-wide uppercase">
          {t("eyebrow")}
        </p>
        <h2
          id="first-offer-title"
          className="text-ink mt-1 text-[19px] leading-snug font-semibold tracking-[-0.02em]"
        >
          {t("title")}
        </h2>
        <p className="text-ink-muted mt-1.5 max-w-lg text-[14px] leading-relaxed">{t("body")}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/offers/new">
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              {t("preview")}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="text-ink-subtle hover:bg-ink/5 hover:text-ink absolute top-3 right-3 rounded-full p-1.5 transition-colors"
        aria-label={t("later")}
        title={t("later")}
      >
        <X className="size-4" />
      </button>
    </section>
  );
}

/* sessionStorage, read through a store so the server render and hydration agree. */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private mode or blocked storage: it simply comes back on the next page.
  }
  listeners.forEach((listener) => listener());
}
