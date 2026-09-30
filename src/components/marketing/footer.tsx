import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LEGAL_DOCUMENTS, LEGAL_PATHS } from "@/content/legal";
import { toLocale, type Locale } from "@/lib/i18n/config";

/**
 * `locale` is for the legal pages, whose language comes from their URL rather
 * than the cookie; everywhere else the footer follows the visitor's locale.
 */
export async function MarketingFooter({ locale: forced }: { locale?: Locale } = {}) {
  const locale = forced ?? toLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "landing.footer" });

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
          {/* Absolute, so it also works from the legal pages. */}
          <Link href="/#pricing" className="hover:text-ink transition-colors">
            {t("pricing")}
          </Link>
        </div>
      </div>

      <div className="text-ink-subtle mx-auto mt-8 flex max-w-6xl flex-col gap-3 px-4 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>© {new Date().getFullYear()} TheSessionLink</span>
        <nav aria-label={t("legalLabel")} className="flex flex-wrap gap-x-4 gap-y-1.5">
          {LEGAL_DOCUMENTS.map((doc) => (
            <Link
              key={doc}
              href={LEGAL_PATHS[doc][locale]}
              className="hover:text-ink transition-colors"
            >
              {t(`legal.${doc}`)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
