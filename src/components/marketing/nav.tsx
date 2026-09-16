"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";

const LINKS = [
  { href: "#how", key: "how" },
  { href: "#features", key: "features" },
  { href: "#examples", key: "examples" },
  { href: "#pricing", key: "pricing" },
] as const;

export function MarketingNav() {
  const t = useTranslations("landing.nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-line bg-canvas/80 border-b backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="TheSessionLink">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
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
          <LocaleSwitcher />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?intent=signup">{t("cta")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
