"use client";

import { ArrowRight, Check, Copy, ExternalLink, LayoutList, Printer } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties, type ReactNode } from "react";

import { SocialIcon } from "@/components/brand/social-icons";
import { PageView } from "@/components/page/page-view";
import { PhoneFrame } from "@/components/page/phone-frame";
import { ShareLink } from "@/components/share/share-link";
import { QrCodePanel } from "@/components/stats/qr-code";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import type { PagePreview } from "@/lib/page/preview";
import type { ThemeId } from "@/lib/page/themes";

import { Celebration } from "./celebration";

/**
 * "Your page is live" — the end of the sign-up.
 *
 * The page itself, in a phone, through the same renderer visitors get; the
 * link to copy and share; its QR code; and three things worth doing next, each
 * one actionable from here: the Instagram bio (with the tracking link the
 * sign-up created, so visits from there are counted as such), completing the
 * page, printing the code. Then the way into the product.
 */
export function DoneScreen({
  preview,
  url,
  instagramUrl,
  slug,
  theme,
  accent,
}: {
  preview: PagePreview;
  url: string;
  instagramUrl: string;
  slug: string;
  theme: ThemeId;
  accent: string;
}) {
  const t = useTranslations("onboarding.done");
  const name = preview.profile.display_name;

  return (
    <div className="space-y-10">
      <Celebration>
        <header>
          <span className="bg-success-soft text-success inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
            <span aria-hidden className="bg-success size-1.5 rounded-full" />
            {t("badge")}
          </span>
          <h1 className="text-ink mt-5 text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[38px]">
            {t.rich("title", {
              accent: (chunks) => <span className="display-accent">{chunks}</span>,
            })}
          </h1>
          <p className="text-ink-muted mt-3 max-w-lg text-[16px] leading-relaxed">
            {t("subtitle")}
          </p>
        </header>
      </Celebration>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_250px] md:items-start md:gap-y-8">
        <section style={rise(0.1)} className="rise-in surface-card p-5 sm:p-6 md:col-start-1">
          <ShareLink url={url} displayName={name} showQr={false} />
        </section>

        <figure
          style={rise(0.15)}
          className="rise-in md:sticky md:top-6 md:col-start-2 md:row-span-2 md:row-start-1"
        >
          <PhoneFrame
            className="max-w-[250px]"
            screenClassName="h-[380px] md:h-[460px] rounded-[1.5rem]"
            scale={0.58}
          >
            <PageView
              preview
              profile={preview.profile}
              blocks={preview.blocks}
              offers={preview.offers}
              theme={theme}
              accent={accent}
            />
          </PhoneFrame>
          <figcaption className="text-ink-subtle mt-2 text-center text-[12px]">
            {t("preview")}
          </figcaption>
        </figure>
        <section aria-labelledby="tips-title" className="space-y-3 md:col-start-1">
          <h2 id="tips-title" className="text-ink text-[17px] font-semibold tracking-[-0.02em]">
            {t("tipsTitle")}
          </h2>
          <ol className="space-y-3">
            <Tip
              index={1}
              icon={<SocialIcon name="instagram" className="size-4.5" />}
              title={t("tips.instagram.title")}
              body={t("tips.instagram.body")}
            >
              <CopyLine value={instagramUrl} />
            </Tip>
            <Tip
              index={2}
              icon={<LayoutList className="size-4.5" aria-hidden />}
              title={t("tips.complete.title")}
              body={t("tips.complete.body")}
            >
              <Link
                href="/dashboard/page"
                className="text-ink inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
              >
                {t("tips.complete.cta")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Tip>
            <Tip
              index={3}
              icon={<Printer className="size-4.5" aria-hidden />}
              title={t("tips.print.title")}
              body={t("tips.print.body")}
            >
              <QrCodePanel
                url={url}
                filename={`qr-${slug}`}
                displayName={name}
                accent={accent}
                theme={theme}
                size={168}
                actions={["png", "print"]}
                className="pt-1"
              />
            </Tip>
          </ol>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard/page">
            {t("toPage")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={url} target="_blank" rel="noopener noreferrer">
            {t("viewPage")}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  );
}

function rise(delay: number): CSSProperties {
  return { "--rise-delay": `${delay}s` } as CSSProperties;
}

function Tip({
  index,
  icon,
  title,
  body,
  children,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <li
      style={rise(0.15 + index * 0.06)}
      className="rise-in border-line bg-surface flex gap-3.5 rounded-[var(--radius-md)] border p-4"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-ink text-[14.5px] font-medium">{title}</p>
        <p className="text-ink-muted text-[13.5px] leading-relaxed">{body}</p>
        {children}
      </div>
    </li>
  );
}

/** The Instagram tracking link, with its own copy button. */
function CopyLine({ value }: { value: string }) {
  const t = useTranslations("onboarding.done.tips.instagram");
  const tShare = useTranslations("share");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error(tShare("copyFailed"));
    }
  }

  return (
    <div className="border-line-strong flex items-center gap-2 rounded-full border p-1 pl-3.5">
      <span className="text-ink min-w-0 flex-1 truncate font-mono text-[12.5px]">
        {value.replace(/^https?:\/\//, "")}
      </span>
      <Button type="button" size="sm" variant={copied ? "primary" : "secondary"} onClick={copy}>
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
      </Button>
    </div>
  );
}
