"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useState, type CSSProperties } from "react";

import { Logo } from "@/components/brand/logo";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", key: "features" },
  { href: "#examples", key: "examples" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

/**
 * The landing's bar: the logo, the four sections worth jumping to, then the
 * two ways in — "Log in" quietly, "Start for free" as the button.
 *
 * Fixed rather than sticky-in-flow, so nothing moves when it changes: past
 * the first few pixels it only gains a blurred background and a hairline,
 * both of which take no space (the border is there from the start, just
 * transparent). On a phone the links move into a drawer from the right — a
 * real dialog, so focus stays inside it and Escape closes it.
 */
export function MarketingNav() {
  const t = useTranslations("landing.nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line bg-canvas/80 backdrop-blur-xl" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="TheSessionLink" className="shrink-0">
          <Logo className="text-[14.5px] sm:text-[17px]" />
        </Link>

        <nav aria-label={t("label")} className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-ink-muted hover:text-ink rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <PreferenceToggles tone="brand" dense />
          <Link
            href="/login"
            className="text-ink-muted hover:text-ink hidden rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors md:inline-flex"
          >
            {t("login")}
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/login?intent=signup">{t("cta")}</Link>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              aria-label={t("openMenu")}
              className="text-ink hover:bg-ink/5 flex size-10 items-center justify-center rounded-full transition-colors md:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="bg-scrim fixed inset-0 z-50 backdrop-blur-[2px] data-[state=closed]:animate-[fade-out_150ms_ease] data-[state=open]:animate-[fade-in_200ms_ease]" />
              <Dialog.Content className="bg-canvas fixed inset-y-0 right-0 z-50 flex w-[min(86vw,340px)] flex-col shadow-[var(--shadow-pop)] outline-none data-[state=closed]:animate-[slide-out-right_200ms_ease] data-[state=open]:animate-[slide-in-right_320ms_var(--ease-out-expo)]">
                <div className="flex h-16 items-center justify-between px-5">
                  <Dialog.Title asChild>
                    <span>
                      <Logo className="text-[15px]" />
                    </span>
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    {t("menuDescription")}
                  </Dialog.Description>
                  <Dialog.Close
                    aria-label={t("closeMenu")}
                    className="text-ink hover:bg-ink/5 -mr-2 flex size-10 items-center justify-center rounded-full transition-colors"
                  >
                    <X className="size-5" aria-hidden />
                  </Dialog.Close>
                </div>

                <nav aria-label={t("label")} className="flex-1 overflow-y-auto px-3 py-2">
                  <ul className="space-y-1">
                    {LINKS.map((link, index) => (
                      <li
                        key={link.key}
                        className="rise-in"
                        style={{ "--rise-delay": `${0.08 + index * 0.04}s` } as CSSProperties}
                      >
                        <a
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="text-ink hover:bg-ink/5 flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-3.5 text-[17px] font-medium transition-colors"
                        >
                          {t(link.key)}
                          <ArrowRight className="text-ink-subtle size-4" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="border-line space-y-2.5 border-t p-5">
                  <Button asChild size="lg" block>
                    <Link href="/login?intent=signup" onClick={() => setOpen(false)}>
                      {t("cta")}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" block>
                    <Link href="/login" onClick={() => setOpen(false)}>
                      {t("login")}
                    </Link>
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
