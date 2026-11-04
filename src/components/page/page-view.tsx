"use client";

import { Hammer, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { PreferenceToggles } from "@/components/preferences/preference-toggles";
import { OfferDetails } from "@/components/public-profile/offer-details";
import { OfferSheet } from "@/components/public-profile/offer-sheet";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { ProfileAvatar } from "@/components/ui/primitives";
import { visibleFields } from "@/lib/offers/fields";
import type { PageBlock } from "@/lib/page/blocks";
import { THEMES, accentPalette, getTheme, themeStyle } from "@/lib/page/themes";
import { cn } from "@/lib/utils";

import { BlockView, type BlockContext } from "./block-views";
import { PreviewContext } from "./tracked";
import { TrackingProvider } from "./tracking";

/**
 * A coach's page: the header, then the blocks in their order, in the theme
 * and accent they chose.
 *
 * The one renderer for both the public page (/[slug], rendered on the server)
 * and the editor's phone preview — so what the coach sees is what visitors
 * get, not a lookalike. Sizes follow the page's own width through container
 * queries, never the window's: inside a 390px preview frame on a desktop
 * screen it lays out exactly as on a phone.
 */
export function PageView({
  profile,
  blocks,
  offers,
  theme: themeId,
  accent,
  preview = false,
  initialOfferId,
  renderPending,
}: {
  profile: PublicProfile;
  /** Visible, valid blocks, in order. */
  blocks: PageBlock[];
  offers: PublicOffer[];
  theme: string;
  accent: string;
  preview?: boolean;
  initialOfferId?: string;
  /** Editor preview: how a block still to complete is drawn. Never on the public page. */
  renderPending?: (block: PageBlock) => React.ReactNode;
}) {
  const t = useTranslations("publicProfile");
  const theme = getTheme(themeId);
  const palette = accentPalette(accent, theme);
  const style = themeStyle(theme, palette);
  const [openId, setOpenId] = useState<string | null>(preview ? null : (initialOfferId ?? null));

  const offerMap = useMemo(() => new Map(offers.map((offer) => [offer.id, offer])), [offers]);
  // A service block whose offer is hidden or gone draws nothing; leave it out
  // of the count so "being set up" still shows on a page with nothing to show.
  const shown = blocks.filter(
    (block) =>
      (block.pending ? preview && Boolean(renderPending) : true) &&
      (block.type !== "service" || (block.offerId && offerMap.has(block.offerId))),
  );

  // Keep the URL shareable: /slug?offer=<id> opens straight on that offer.
  useEffect(() => {
    if (preview) return;
    const url = new URL(window.location.href);
    if (openId) url.searchParams.set("offer", openId);
    else url.searchParams.delete("offer");
    window.history.replaceState(null, "", url.toString());
  }, [openId, preview]);

  // The block an offer was opened from, so its WhatsApp button or its form
  // counts as a contact of that block. A shared ?offer= link has none.
  const [openFrom, setOpenFrom] = useState<string | null>(null);
  const context: BlockContext = {
    profile,
    offers: offerMap,
    onOpenOffer: (offerId, blockId) => {
      setOpenId(offerId);
      setOpenFrom(blockId);
    },
  };
  const sheetPalette = accentPalette(accent, THEMES.classic);

  return (
    <PreviewContext.Provider value={preview}>
      <Tracking enabled={!preview} profileId={profile.id}>
        <div
          style={style}
          data-theme={theme.id}
          data-buttons={theme.buttons}
          data-cards={theme.cards}
          className={cn("page-root @container relative", preview ? "min-h-full" : "min-h-dvh")}
        >
          {preview ? null : (
            <div className="absolute top-4 right-4 z-20">
              <PreferenceToggles tone="glass" />
            </div>
          )}

          <div className="mx-auto w-full max-w-[34rem] px-5 pt-14 pb-14 @md:pt-20">
            <Header profile={profile} />

            {profile.published && shown.length > 0 ? (
              <div className="mt-8 space-y-3.5">
                {shown.map((block, index) => (
                  <div
                    key={block.id}
                    className="rise-in"
                    style={{ "--rise-delay": `${Math.min(index, 10) * 0.045}s` } as CSSProperties}
                  >
                    {block.pending ? (
                      renderPending?.(block)
                    ) : (
                      <BlockView block={block} context={context} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <SetupInProgress name={profile.display_name} />
            )}

            <footer className="mt-12 text-center">
              <Link
                href="/"
                onClick={preview ? (event) => event.preventDefault() : undefined}
                className="text-[12px] text-[var(--page-muted)] opacity-80 transition-opacity hover:opacity-100"
              >
                {t("poweredBy")}
              </Link>
            </footer>
          </div>
        </div>

        {preview ? null : (
          <OfferSheet
            offer={openId ? (offerMap.get(openId) ?? null) : null}
            profile={profile}
            accentStyle={
              {
                "--accent": sheetPalette.accent,
                "--accent-on": sheetPalette.on,
                "--accent-ink": sheetPalette.ink,
                "--accent-soft": sheetPalette.soft,
                "--accent-hover": sheetPalette.hover,
              } as CSSProperties
            }
            blockId={openFrom}
            onClose={() => {
              setOpenId(null);
              setOpenFrom(null);
            }}
          />
        )}
      </Tracking>
    </PreviewContext.Provider>
  );
}

/** Statistics run on the public page only; the preview sends nothing. */
function Tracking({
  enabled,
  profileId,
  children,
}: {
  enabled: boolean;
  profileId: string;
  children: React.ReactNode;
}) {
  return enabled ? <TrackingProvider profileId={profileId}>{children}</TrackingProvider> : children;
}

function Header({ profile }: { profile: PublicProfile }) {
  const t = useTranslations("publicProfile");
  const details = visibleFields(profile.details);

  return (
    <header className="flex flex-col items-center text-center">
      {profile.avatar_url ? (
        <div className="relative size-24 overflow-hidden rounded-full ring-4 ring-[color-mix(in_oklab,var(--page-text)_8%,transparent)]">
          <Image
            src={profile.avatar_url}
            alt={profile.display_name}
            fill
            sizes="96px"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <ProfileAvatar name={profile.display_name} className="size-24 text-[26px]" />
      )}

      <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em] @sm:text-[30px]">
        {profile.display_name}
      </h1>
      {profile.headline ? (
        <p className="mt-1.5 max-w-md text-[15.5px] leading-relaxed text-[var(--page-muted)]">
          {profile.headline}
        </p>
      ) : null}

      {profile.categoryName || profile.location ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12.5px]">
          {profile.categoryName ? (
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent-ink)]">
              {profile.categoryName}
            </span>
          ) : null}
          {profile.location ? (
            <span className="inline-flex items-center gap-1 text-[var(--page-muted)]">
              <MapPin className="size-3.5" aria-hidden />
              {profile.location}
            </span>
          ) : null}
        </div>
      ) : null}

      {profile.bio ? (
        <p className="mt-4 max-w-md text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--page-muted)]">
          {profile.bio}
        </p>
      ) : null}

      {details.length > 0 ? (
        <section aria-label={t("detailsTitle")} className={cn("mt-5 w-full text-left")}>
          <OfferDetails fields={profile.details} />
        </section>
      ) : null}
    </header>
  );
}

/**
 * What a visitor sees before the page has anything to show: it is being
 * prepared, and by whom. The outlined cards stand in for what is to come;
 * their shimmer only runs for readers who allow motion.
 */
function SetupInProgress({ name }: { name: string }) {
  const t = useTranslations("publicProfile.setup");

  return (
    <section aria-labelledby="setup-title" className="page-card mt-8 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
        <Hammer className="size-4.5" aria-hidden />
      </span>
      <h2 id="setup-title" className="mt-4 text-[18px] font-semibold tracking-[-0.02em]">
        {t("title")}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--page-muted)]">
        {t("body", { name })}
      </p>
      <div aria-hidden className="mt-6 space-y-2.5">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-12 rounded-[min(var(--page-radius),16px)] border border-dashed border-[var(--page-border)] motion-safe:animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
