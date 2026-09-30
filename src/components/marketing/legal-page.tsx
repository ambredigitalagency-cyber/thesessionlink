import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { Logo } from "@/components/brand/logo";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  LEGAL_CONTENT,
  LEGAL_PATHS,
  type LegalBlock,
  type LegalDocumentKey,
} from "@/content/legal";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

const OTHER: Record<Locale, Locale> = { fr: "en", en: "fr" };

export function legalMetadata(doc: LegalDocumentKey, locale: Locale): Metadata {
  const content = LEGAL_CONTENT[doc][locale];

  return {
    title: content.title,
    description: content.summary,
    alternates: {
      canonical: LEGAL_PATHS[doc][locale],
      languages: { fr: LEGAL_PATHS[doc].fr, en: LEGAL_PATHS[doc].en },
    },
  };
}

/**
 * One legal document in one language. The route picks the language, not the
 * cookie: the whole page — header, text, footer — is rendered in it, and the
 * header links to the same document in the other language.
 */
export async function LegalPage({ doc, locale }: { doc: LegalDocumentKey; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "legal" });
  const content = LEGAL_CONTENT[doc][locale];
  const other = OTHER[locale];

  return (
    <div lang={locale} className="flex min-h-dvh flex-col">
      <header className="border-line border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label={t("home")}>
            <Logo />
          </Link>
          <Link
            href={LEGAL_PATHS[doc][other]}
            hrefLang={other}
            lang={other}
            className="text-ink-muted hover:text-ink text-[13px] transition-colors"
          >
            {LOCALE_LABELS[other]}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-ink text-[30px] leading-tight font-semibold tracking-[-0.03em] sm:text-[38px]">
          {content.title}
        </h1>
        <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">{content.summary}</p>
        <p className="text-ink-subtle mt-2 text-[12.5px]">
          {t("updated")} <Placeholders text={content.updated} />
        </p>

        <div className="mt-10 space-y-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-ink text-[18px] font-semibold tracking-[-0.02em]">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <MarketingFooter locale={locale} />
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const text = "text-ink-muted text-[14.5px] leading-relaxed";

  if (typeof block === "string") {
    return (
      <p className={text}>
        <Placeholders text={block} />
      </p>
    );
  }

  return (
    <ul className={`${text} list-disc space-y-1.5 pl-5 marker:text-[var(--color-line-strong)]`}>
      {block.list.map((item) => (
        <li key={item}>
          <Placeholders text={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Highlights every [BRACKETED] placeholder, so text the owner has not filled
 * in yet cannot pass for the real thing — on screen or in review.
 */
function Placeholders({ text }: { text: string }) {
  return text.split(/(\[[^\]]+\])/).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="bg-warning-soft text-ink rounded-[3px] px-1 font-medium">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
