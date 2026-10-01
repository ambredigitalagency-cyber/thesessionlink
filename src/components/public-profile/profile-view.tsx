"use client";

import { CalendarOff, Hammer, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SocialIcon, socialUrl } from "@/components/brand/social-icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlays";
import { Badge, ProfileAvatar } from "@/components/ui/primitives";
import { visibleFields } from "@/lib/offers/fields";
import { parseActionConfig } from "@/lib/offers/schema";
import { cn, whatsappLink } from "@/lib/utils";
import { SOCIAL_KEYS, type SocialKey } from "@/lib/validation";

import { BookingPanel } from "./booking-panel";
import { OfferCard, OfferPrice } from "./offer-card";
import { OfferDetails } from "./offer-details";
import { OfferGallery } from "./offer-gallery";
import type { PublicOffer, PublicProfile } from "./types";
import { PreferenceToggles } from "@/components/preferences/preference-toggles";

export function PublicProfileView({
  profile,
  offers,
  initialOfferId,
}: {
  profile: PublicProfile;
  offers: PublicOffer[];
  initialOfferId?: string;
}) {
  const t = useTranslations("publicProfile");
  const [openId, setOpenId] = useState<string | null>(initialOfferId ?? null);

  // Keep the URL shareable: /slug?offer=<id> opens straight on that offer.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (openId) {
      url.searchParams.set("offer", openId);
    } else {
      url.searchParams.delete("offer");
    }
    window.history.replaceState(null, "", url.toString());
  }, [openId]);

  const open = offers.find((offer) => offer.id === openId) ?? null;
  const socials = SOCIAL_KEYS.filter((key) => profile.social_links[key]);

  const contacts = [
    profile.contact_email
      ? {
          key: "email" as const,
          href: `mailto:${profile.contact_email}`,
          icon: Mail,
          label: t("contact.email"),
        }
      : null,
    profile.whatsapp_number
      ? {
          key: "whatsapp" as const,
          href: whatsappLink(profile.whatsapp_number),
          icon: MessageCircle,
          label: t("contact.whatsapp"),
        }
      : null,
    profile.phone_number
      ? {
          key: "phone" as const,
          href: `tel:${profile.phone_number}`,
          icon: Phone,
          label: t("contact.phone"),
        }
      : null,
  ].filter(Boolean) as { key: string; href: string; icon: typeof Mail; label: string }[];

  const hasCalendarOffer = offers.some((offer) => offer.action_type === "calendar_booking");
  const layout = profile.layout;
  const justify = layout === "centered" ? "justify-center" : "justify-start";

  const avatar = (size: string, initialsSize: string) =>
    profile.avatar_url ? (
      <div className={cn("ring-line relative shrink-0 overflow-hidden rounded-full ring-1", size)}>
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
      <ProfileAvatar name={profile.display_name} className={cn(size, initialsSize)} />
    );

  const identity = (
    <>
      <h1 className="text-ink text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[32px]">
        {profile.display_name}
      </h1>
      {profile.headline ? (
        <p
          className={cn(
            "text-ink-muted mt-2 max-w-md text-[16px] leading-relaxed",
            layout === "centered" && "mx-auto",
          )}
        >
          {profile.headline}
        </p>
      ) : null}
      {(profile.categoryName || profile.location) && (
        <div className={cn("mt-3 flex flex-wrap items-center gap-2", justify)}>
          {profile.categoryName ? <Badge tone="accent">{profile.categoryName}</Badge> : null}
          {profile.location ? (
            <span className="text-ink-subtle inline-flex items-center gap-1 text-[13px]">
              <MapPin className="size-3.5" />
              {profile.location}
            </span>
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <div data-accent={profile.accent} className="relative">
      <div className="absolute top-4 right-4 z-20">
        <PreferenceToggles tone="glass" />
      </div>
      {layout === "banner" ? (
        // The band sits behind the top of the page; the avatar is placed so
        // that it straddles its lower edge (container padding = band − half
        // the avatar).
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(135deg,var(--accent),color-mix(in_oklab,var(--accent)_55%,var(--color-canvas)))] sm:h-44"
        />
      ) : (
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60" />
      )}

      <div
        className={cn(
          "relative mx-auto w-full px-4 pb-24 sm:px-6",
          layout === "compact" ? "max-w-[56rem]" : "max-w-[42rem]",
          layout === "banner" ? "pt-24 sm:pt-32" : "pt-10 sm:pt-16",
        )}
      >
        <header
          className={cn(
            "flex flex-col",
            layout === "centered" ? "items-center text-center" : "items-start text-left",
          )}
        >
          {layout === "compact" ? (
            <div className="flex items-center gap-4 sm:gap-5">
              {avatar("size-20 sm:size-24", "text-[22px]")}
              <div className="min-w-0">{identity}</div>
            </div>
          ) : (
            <>
              {avatar(
                cn("size-24", layout === "banner" && "ring-4 ring-[var(--color-canvas)]"),
                "text-[26px]",
              )}
              <div className="mt-5">{identity}</div>
            </>
          )}

          {profile.bio ? (
            <p
              className={cn(
                "text-ink-muted mt-5 max-w-lg text-[15px] leading-relaxed whitespace-pre-wrap",
                layout === "compact" && "max-w-2xl",
              )}
            >
              {profile.bio}
            </p>
          ) : null}

          {socials.length > 0 ? (
            <div className={cn("mt-5 flex flex-wrap items-center gap-1.5", justify)}>
              {socials.map((key) => (
                <a
                  key={key}
                  href={socialUrl(key as SocialKey, profile.social_links[key] ?? "")}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="border-line text-ink-muted hover:border-ink/30 hover:text-ink flex size-9 items-center justify-center rounded-full border transition-colors"
                  aria-label={key}
                >
                  <SocialIcon name={key as SocialKey} className="size-4" />
                </a>
              ))}
            </div>
          ) : null}

          {contacts.length > 0 ? (
            <div className={cn("mt-4 flex flex-wrap gap-2", justify)}>
              {contacts.map((contact) => (
                <Button key={contact.key} asChild variant="secondary" size="sm">
                  <a
                    href={contact.href}
                    target={contact.key === "whatsapp" ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <contact.icon className="size-3.5" />
                    {contact.label}
                  </a>
                </Button>
              ))}
            </div>
          ) : null}
        </header>

        {visibleFields(profile.details).length > 0 ? (
          <section aria-labelledby="profile-details" className="mt-10">
            <h2
              id="profile-details"
              className="text-ink-subtle mb-2 text-[11.5px] font-medium tracking-wide uppercase"
            >
              {t("detailsTitle")}
            </h2>
            <OfferDetails fields={profile.details} />
          </section>
        ) : null}

        {!profile.calendar_visible && hasCalendarOffer ? (
          <div className="border-line bg-surface mt-10 flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 sm:p-5">
            <span className="bg-ink/5 text-ink-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
              <CalendarOff className="size-4" />
            </span>
            <div>
              <p className="text-ink text-[14.5px] font-medium">{t("closedTitle")}</p>
              <p className="text-ink-muted mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">
                {profile.custom_closed_message || t("closedDefault")}
              </p>
            </div>
          </div>
        ) : null}

        {offers.length > 0 ? (
          <section
            className={cn(
              "mt-10 grid gap-3.5",
              layout === "compact" && offers.length > 1 && "sm:grid-cols-2",
            )}
          >
            <h2 className="sr-only">{t("offersTitle")}</h2>
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                currency={profile.currency}
                locale={profile.locale}
                variant={profile.cards}
                onOpen={() => setOpenId(offer.id)}
              />
            ))}
          </section>
        ) : (
          <SetupInProgress name={profile.display_name} />
        )}

        <footer className="mt-14 text-center">
          <Link
            href="/"
            className="text-ink-subtle hover:text-ink-muted text-[12.5px] transition-colors"
          >
            {t("poweredBy")}
          </Link>
        </footer>
      </div>

      <OfferSheet offer={open} profile={profile} onClose={() => setOpenId(null)} />
    </div>
  );
}

/**
 * What a visitor sees before the first offer is published.
 *
 * A link answers from the moment it is reserved, before its first offer is
 * published. An empty list reads as abandoned; this says the page is being
 * prepared, and by whom. It offers no way to reach the coach — the contact
 * buttons only appear with the first offer (see the page) — so the card is
 * the whole message. The two outlined cards stand in for the offers to come;
 * their shimmer only runs for readers who allow motion.
 */
function SetupInProgress({ name }: { name: string }) {
  const t = useTranslations("publicProfile.setup");

  return (
    <section
      aria-labelledby="setup-title"
      className="border-line bg-surface mt-10 rounded-[var(--radius-lg)] border p-5 text-center sm:p-7"
    >
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
        <Hammer className="size-4.5" aria-hidden />
      </span>
      <h2 id="setup-title" className="text-ink mt-4 text-[18px] font-semibold tracking-[-0.02em]">
        {t("title")}
      </h2>
      <p className="text-ink-muted mx-auto mt-1.5 max-w-sm text-[14.5px] leading-relaxed">
        {t("body", { name })}
      </p>

      <div aria-hidden className="mt-6 space-y-2.5">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="border-line flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed p-3.5 text-left"
          >
            <span className="bg-ink/[0.05] size-10 shrink-0 rounded-[var(--radius-sm)] motion-safe:animate-pulse" />
            <span className="flex-1 space-y-2">
              <span className="bg-ink/[0.06] block h-2.5 w-2/5 rounded-full motion-safe:animate-pulse" />
              <span className="bg-ink/[0.04] block h-2 w-3/5 rounded-full motion-safe:animate-pulse" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OfferSheet({
  offer,
  profile,
  onClose,
}: {
  offer: PublicOffer | null;
  profile: PublicProfile;
  onClose: () => void;
}) {
  const t = useTranslations("publicProfile");
  const tActions = useTranslations("offers.actions");

  if (!offer) return null;

  const isCalendar = offer.action_type === "calendar_booking";
  const calendarClosed = isCalendar && !profile.calendar_visible;

  const whatsappConfig =
    offer.action_type === "whatsapp_direct"
      ? parseActionConfig("whatsapp_direct", offer.action_config)
      : null;
  const whatsappNumber = whatsappConfig?.whatsapp_number || profile.whatsapp_number;

  return (
    <Sheet
      open={Boolean(offer)}
      onOpenChange={(open) => !open && onClose()}
      title={offer.title}
      description={tActions(`${offer.action_type}.label`)}
      className="sm:max-w-lg"
    >
      <div data-accent={profile.accent} className="space-y-6">
        <OfferGallery offer={offer} />

        <div className="flex items-center justify-between gap-4">
          <OfferPrice
            offer={offer}
            currency={profile.currency}
            locale={profile.locale}
            className="text-[20px]"
          />
        </div>

        {offer.description ? (
          <p className="text-ink-muted text-[15px] leading-relaxed whitespace-pre-wrap">
            {offer.description}
          </p>
        ) : null}

        <OfferDetails fields={offer.custom_fields} />

        <div className={cn("border-line border-t pt-6")}>
          {calendarClosed ? (
            <div className="bg-ink/[0.03] rounded-[var(--radius-md)] p-4 text-center">
              <p className="text-ink text-[14.5px] font-medium">{t("closedTitle")}</p>
              <p className="text-ink-muted mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">
                {profile.custom_closed_message || t("closedDefault")}
              </p>
              {profile.contact_email ? (
                <Button asChild variant="secondary" size="sm" className="mt-4">
                  <a href={`mailto:${profile.contact_email}`}>{t("contact.email")}</a>
                </Button>
              ) : null}
            </div>
          ) : offer.action_type === "whatsapp_direct" ? (
            whatsappNumber ? (
              <Button asChild variant="accent" size="lg" block>
                <a
                  href={whatsappLink(
                    whatsappNumber,
                    whatsappConfig?.prefilled_message ?? undefined,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" />
                  {whatsappConfig?.cta_label || t("cta.whatsapp_direct")}
                </a>
              </Button>
            ) : (
              <p className="text-ink-muted text-center text-[14px]">{t("whatsappUnavailable")}</p>
            )
          ) : (
            <BookingPanel offer={offer} profile={profile} />
          )}
        </div>
      </div>
    </Sheet>
  );
}
