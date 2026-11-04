import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LEGAL_DOCUMENTS, LEGAL_PATHS } from "@/content/legal";
import { supportWhatsapp } from "@/lib/env";
import { toLocale, type Locale } from "@/lib/i18n/config";

/**
 * The product, the legal pages, and a way to reach a person. Support is a
 * WhatsApp conversation — the channel the coaches themselves live in — and
 * only appears once its number is configured (SUPPORT_WHATSAPP).
 *
 * `locale` is for the legal pages, whose language comes from their URL rather
 * than the cookie; everywhere else the footer follows the visitor's locale.
 * Section links are absolute (/#…) so they also work from the legal pages.
 */
export async function MarketingFooter({ locale: forced }: { locale?: Locale } = {}) {
  const locale = forced ?? toLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "landing.footer" });
  const whatsapp = supportWhatsapp();

  const linkClass = "text-ink-muted hover:text-ink transition-colors";

  return (
    <footer className="border-line bg-canvas border-t pt-12 pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Logo />
          <p className="text-ink-muted mt-2 max-w-xs text-[13px] leading-relaxed">{t("tagline")}</p>
        </div>

        <nav aria-label={t("productLabel")} className="text-[13.5px]">
          <h2 className="text-ink text-[12px] font-semibold tracking-[0.08em] uppercase">
            {t("productLabel")}
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/#features" className={linkClass}>
                {t("features")}
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className={linkClass}>
                {t("pricing")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t("legalLabel")} className="text-[13.5px]">
          <h2 className="text-ink text-[12px] font-semibold tracking-[0.08em] uppercase">
            {t("legalLabel")}
          </h2>
          <ul className="mt-3 space-y-2">
            {LEGAL_DOCUMENTS.map((doc) => (
              <li key={doc}>
                <Link href={LEGAL_PATHS[doc][locale]} className={linkClass}>
                  {t(`legal.${doc}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {whatsapp ? (
          <div className="text-[13.5px]">
            <h2 className="text-ink text-[12px] font-semibold tracking-[0.08em] uppercase">
              {t("supportLabel")}
            </h2>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(t("supportMessage"))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line-strong text-ink hover:border-ink/30 mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-medium transition-colors"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t("support")}
            </a>
          </div>
        ) : null}
      </div>

      <div className="text-ink-subtle mx-auto mt-10 max-w-6xl px-4 text-[12px] sm:px-6">
        © {new Date().getFullYear()} TheSessionLink
      </div>
    </footer>
  );
}
