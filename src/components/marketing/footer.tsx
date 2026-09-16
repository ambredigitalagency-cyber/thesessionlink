import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";

import { LocaleSwitcher } from "./locale-switcher";

export async function MarketingFooter() {
  const t = await getTranslations("landing.footer");

  return (
    <footer className="border-line bg-canvas border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="text-ink-muted mt-2 max-w-xs text-[13px] leading-relaxed">{t("tagline")}</p>
        </div>

        <div className="text-ink-muted flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <Link href="/login" className="hover:text-ink transition-colors">
            {t("login")}
          </Link>
          <Link href="/login?intent=signup" className="hover:text-ink transition-colors">
            {t("signup")}
          </Link>
          <a href="#pricing" className="hover:text-ink transition-colors">
            {t("pricing")}
          </a>
          <LocaleSwitcher />
        </div>
      </div>

      <div className="text-ink-subtle mx-auto mt-8 max-w-6xl px-4 text-[12px] sm:px-6">
        © {new Date().getFullYear()} TheSessionLink
      </div>
    </footer>
  );
}
