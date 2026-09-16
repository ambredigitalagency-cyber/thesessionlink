"use client";

import { CalendarOff, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SocialIcon, socialUrl } from "@/components/brand/social-icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlays";
import { Badge, ProfileAvatar } from "@/components/ui/primitives";
import { parseActionConfig, visibleFields } from "@/lib/offers/schema";
import { cn, whatsappLink } from "@/lib/utils";
import { SOCIAL_KEYS, type SocialKey } from "@/lib/validation";

import { BookingPanel } from "./booking-panel";
import { OfferCard, OfferPrice } from "./offer-card";
import { OfferGallery } from "./offer-gallery";
import type { PublicOffer, PublicProfile } from "./types";

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

  return (
    <div data-accent={profile.accent} className="relative">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60" />

      <div className="relative mx-auto w-full max-w-[42rem] px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
        <header className="flex flex-col items-center text-center">
          {profile.avatar_url ? (
            <div className="ring-line relative size-24 overflow-hidden rounded-full ring-1">
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

          <h1 className="text-ink mt-5 text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[32px]">
            {profile.display_name}
          </h1>

          {profile.headline ? (
            <p className="text-ink-muted mt-2 max-w-md text-[16px] leading-relaxed">
              {profile.headline}
            </p>
          ) : null}

          {(profile.categoryName || profile.location) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {profile.categoryName ? <Badge tone="accent">{profile.categoryName}</Badge> : null}
              {profile.location ? (
                <span className="text-ink-subtle inline-flex items-center gap-1 text-[13px]">
                  <MapPin className="size-3.5" />
                  {profile.location}
                </span>
              ) : null}
            </div>
          )}

          {profile.bio ? (
            <p className="text-ink-muted mt-5 max-w-lg text-[15px] leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          ) : null}

          {socials.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
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

        <section className="mt-10 space-y-3.5">
          <h2 className="sr-only">{t("offersTitle")}</h2>
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              currency={profile.currency}
              locale={profile.locale}
              onOpen={() => setOpenId(offer.id)}
            />
          ))}
        </section>

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

  const fields = visibleFields(offer.custom_fields);
  const gallery = fields.filter((field) => field.type === "images");
  const details = fields.filter((field) => field.type !== "images");
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

        {details.length > 0 ? (
          <dl className="divide-line border-line divide-y border-y">
            {details.map((field) => (
              <div key={field.id} className="flex items-baseline justify-between gap-6 py-2.5">
                <dt className="text-ink-muted text-[13.5px]">{field.label}</dt>
                <dd className="text-ink text-right text-[14px] font-medium">
                  {Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}
                  {field.unit ? ` ${field.unit}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {gallery.map((field) => (
          <div key={field.id} className="space-y-2">
            <p className="text-ink text-[13px] font-medium">{field.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {(field.value as string[]).map((url) => (
                <div
                  key={url}
                  className="bg-ink/5 relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xs)]"
                >
                  <Image src={url} alt="" fill sizes="240px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}

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
