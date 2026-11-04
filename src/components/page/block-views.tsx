"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Play,
  Star,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { OfferPrice, offerChips } from "@/components/public-profile/offer-card";
import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import type { BlockConfig, PageBlock } from "@/lib/page/blocks";
import { WEEK_ORDER, openStatus, type OpenStatus } from "@/lib/page/hours";
import {
  detectPlatform,
  linkLabel,
  mailtoUrl,
  mapsUrl,
  telUrl,
  whatsappUrl,
  youtubeEmbedUrl,
  youtubeId,
  youtubeThumbnail,
} from "@/lib/page/urls";
import { cn } from "@/lib/utils";

import { PLATFORM_NAMES, PlatformIcon } from "./platform-icon";
import { TrackedButton, TrackedLink } from "./tracked";

export type BlockContext = {
  profile: PublicProfile;
  offers: Map<string, PublicOffer>;
  /** Opens an offer; the block is remembered so the contact made from it counts for it. */
  onOpenOffer: (offerId: string, blockId: string) => void;
};

type Props<T extends PageBlock["type"]> = { block: PageBlock<T>; context: BlockContext };

/** One block, as the public page and the preview both draw it. */
export function BlockView({ block, context }: { block: PageBlock; context: BlockContext }) {
  switch (block.type) {
    case "link":
      return <LinkBlock block={block as PageBlock<"link">} context={context} />;
    case "socials":
      return <SocialsBlock block={block as PageBlock<"socials">} context={context} />;
    case "whatsapp":
      return <WhatsappBlock block={block as PageBlock<"whatsapp">} context={context} />;
    case "call":
      return <CallBlock block={block as PageBlock<"call">} context={context} />;
    case "email":
      return <EmailBlock block={block as PageBlock<"email">} context={context} />;
    case "service":
      return <ServiceBlock block={block as PageBlock<"service">} context={context} />;
    case "youtube":
      return <YoutubeBlock block={block as PageBlock<"youtube">} context={context} />;
    case "text":
      return <TextBlock block={block as PageBlock<"text">} context={context} />;
    case "divider":
      return <hr className="my-2 border-[var(--page-border)]" />;
    case "faq":
      return <FaqBlock block={block as PageBlock<"faq">} context={context} />;
    case "reviews":
      return <ReviewsBlock block={block as PageBlock<"reviews">} context={context} />;
    case "hours":
      return <HoursBlock block={block as PageBlock<"hours">} context={context} />;
    case "gallery":
      return <GalleryBlock block={block as PageBlock<"gallery">} context={context} />;
    case "pricing":
      return <PricingBlock block={block as PageBlock<"pricing">} context={context} />;
    case "address":
      return <AddressBlock block={block as PageBlock<"address">} context={context} />;
    case "file":
      return <FileBlock block={block as PageBlock<"file">} context={context} />;
    case "announcement":
      return <AnnouncementBlock block={block as PageBlock<"announcement">} context={context} />;
    case "stats":
      return <StatsBlock block={block as PageBlock<"stats">} context={context} />;
    case "vcard":
      return <VcardBlock block={block as PageBlock<"vcard">} context={context} />;
  }
}

/** The icon slot at the start of a button, the label centred in what is left. */
function ButtonBody({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-center">{label}</span>
      <span className="flex size-6 shrink-0 items-center justify-center opacity-60" aria-hidden>
        {trailing}
      </span>
    </>
  );
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 text-[17px] leading-snug font-semibold tracking-[-0.01em]">
      {children}
    </h2>
  );
}

/* -------------------------------------------------------------------------- */
/* Links and contacts                                                          */
/* -------------------------------------------------------------------------- */

function LinkBlock({ block }: Props<"link">) {
  const platform = detectPlatform(block.config.url);
  return (
    <TrackedLink blockId={block.id} action="link" href={block.config.url} className="page-btn">
      <ButtonBody
        icon={<PlatformIcon platform={platform} className="size-5" />}
        label={block.config.title || linkLabel(block.config.url)}
        trailing={<ArrowUpRight className="size-4" />}
      />
    </TrackedLink>
  );
}

function SocialsBlock({ block }: Props<"socials">) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2.5 py-1">
      {block.config.links.map((url) => {
        const platform = detectPlatform(url);
        return (
          <li key={url}>
            <TrackedLink
              blockId={block.id}
              action="social"
              href={url}
              className="page-icon-btn"
              aria-label={
                PLATFORM_NAMES[platform] === "Website" ? linkLabel(url) : PLATFORM_NAMES[platform]
              }
            >
              <PlatformIcon platform={platform} className="size-5" />
            </TrackedLink>
          </li>
        );
      })}
    </ul>
  );
}

function WhatsappBlock({ block }: Props<"whatsapp">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="whatsapp"
      href={whatsappUrl(block.config.number, block.config.message)}
      className="page-btn page-btn-primary"
    >
      <ButtonBody
        icon={<PlatformIcon platform="whatsapp" className="size-5" />}
        label={block.config.label || t("whatsapp")}
      />
    </TrackedLink>
  );
}

function CallBlock({ block }: Props<"call">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="call"
      href={telUrl(block.config.number)}
      className="page-btn"
    >
      <ButtonBody icon={<Phone className="size-5" />} label={block.config.label || t("call")} />
    </TrackedLink>
  );
}

function EmailBlock({ block }: Props<"email">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="email"
      href={mailtoUrl(block.config.email)}
      className="page-btn"
    >
      <ButtonBody icon={<Mail className="size-5" />} label={block.config.label || t("email")} />
    </TrackedLink>
  );
}

function VcardBlock({ block }: Props<"vcard">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="vcard"
      href={`/api/vcard/${block.id}`}
      download
      className="page-btn"
    >
      <ButtonBody icon={<UserPlus className="size-5" />} label={block.config.label || t("vcard")} />
    </TrackedLink>
  );
}

function AddressBlock({ block }: Props<"address">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="map"
      href={mapsUrl(block.config.address)}
      className="page-btn"
    >
      <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden>
        <MapPin className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{block.config.label || t("address")}</span>
        <span className="mt-0.5 block text-[13px] font-normal opacity-75">
          {block.config.address}
        </span>
      </span>
      <span className="shrink-0 text-[12.5px] font-medium opacity-75">{t("directions")}</span>
    </TrackedLink>
  );
}

function FileBlock({ block }: Props<"file">) {
  const t = useTranslations("publicProfile.page");
  return (
    <TrackedLink
      blockId={block.id}
      action="file"
      href={block.config.url}
      download
      className="page-btn"
    >
      <ButtonBody
        icon={<FileText className="size-5" />}
        label={block.config.label || block.config.name}
        trailing={<Download className="size-4" aria-label={t("download")} />}
      />
    </TrackedLink>
  );
}

/* -------------------------------------------------------------------------- */
/* Service                                                                     */
/* -------------------------------------------------------------------------- */

function ServiceBlock({ block, context }: Props<"service">) {
  const t = useTranslations("publicProfile");
  const locale = useLocale();
  const offer = block.offerId ? context.offers.get(block.offerId) : undefined;
  if (!offer) return null;
  const chips = offerChips(offer, locale);

  return (
    <TrackedButton
      blockId={block.id}
      action="service"
      onClick={() => context.onOpenOffer(offer.id, block.id)}
      className="page-card group block w-full overflow-hidden !p-0 text-left"
    >
      {offer.main_photo_url ? (
        <span className="relative block aspect-[16/9] w-full overflow-hidden bg-[var(--page-border)]">
          <Image
            src={offer.main_photo_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 560px"
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] motion-safe:group-hover:scale-[1.03]"
          />
        </span>
      ) : null}
      <span className="block p-4">
        <span className="flex items-start justify-between gap-3">
          <span className="text-[16px] leading-snug font-semibold">{offer.title}</span>
          <OfferPrice
            offer={offer}
            currency={context.profile.currency}
            locale={context.profile.locale}
            className="shrink-0 text-[14.5px] text-[var(--page-text)]"
          />
        </span>
        {offer.description ? (
          <span className="mt-1 line-clamp-2 block text-[13.5px] leading-relaxed text-[var(--page-muted)]">
            {offer.description}
          </span>
        ) : null}
        {chips.length > 0 ? (
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((chip, index) => (
              <span
                key={index}
                className="rounded-full bg-[color-mix(in_oklab,var(--page-text)_7%,transparent)] px-2 py-0.5 text-[12px] text-[var(--page-muted)]"
              >
                {chip}
              </span>
            ))}
          </span>
        ) : null}
        <span className="mt-3.5 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-on)]">
          {t(`cta.${offer.action_type}` as "cta.contact_request")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </span>
    </TrackedButton>
  );
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A thumbnail until someone presses play: no YouTube script, cookie or
 * request on the page until then, and only youtube-nocookie.com after.
 */
function YoutubeBlock({ block }: Props<"youtube">) {
  const t = useTranslations("publicProfile.page");
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(block.config.url);
  if (!id) return null;
  const title = block.config.title || t("video");

  return (
    <figure className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-[min(var(--page-radius),20px)] bg-black">
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(id)}
            title={title}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <TrackedButton
            blockId={block.id}
            action="video"
            onClick={() => setPlaying(true)}
            aria-label={t("play", { title })}
            className="group absolute inset-0 block size-full"
          >
            <Image
              src={youtubeThumbnail(id)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 560px"
              className="object-cover opacity-90"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-on)] shadow-lg transition-transform duration-300 motion-safe:group-hover:scale-110">
                <Play className="ml-1 size-7 fill-current" aria-hidden />
              </span>
            </span>
          </TrackedButton>
        )}
      </div>
      {block.config.title ? (
        <figcaption className="text-center text-[13.5px] text-[var(--page-muted)]">
          {block.config.title}
        </figcaption>
      ) : null}
    </figure>
  );
}

function GalleryBlock({ block }: Props<"gallery">) {
  const { images, mode } = block.config;
  if (mode === "before_after" && images.length >= 2) {
    return <BeforeAfter before={images[0]} after={images[1]} />;
  }
  return (
    <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {images.map((image, index) => (
        <div
          key={image.url}
          className={cn(
            "relative overflow-hidden rounded-[min(var(--page-radius),18px)] bg-[var(--page-border)]",
            images.length === 1 || (images.length % 2 === 1 && index === 0)
              ? "col-span-2 aspect-[4/3]"
              : "aspect-square",
          )}
        >
          <Image
            src={image.url}
            alt={image.alt ?? ""}
            fill
            sizes="(max-width: 640px) 50vw, 280px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/** Two photos under one frame; a slider (a real range input) reveals the second. */
function BeforeAfter({
  before,
  after,
}: {
  before: BlockConfig<"gallery">["images"][number];
  after: BlockConfig<"gallery">["images"][number];
}) {
  const t = useTranslations("publicProfile.page");
  const [split, setSplit] = useState(50);
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[min(var(--page-radius),20px)] bg-[var(--page-border)] select-none">
      <Image
        src={after.url}
        alt={after.alt ?? t("after")}
        fill
        sizes="(max-width: 640px) 100vw, 560px"
        className="object-cover"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <Image
          src={before.url}
          alt={before.alt ?? t("before")}
          fill
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-y-0 w-0.5 bg-white shadow"
        style={{ left: `${split}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black shadow-md">
          ⇆
        </span>
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white">
        {t("before")}
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white">
        {t("after")}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label={t("compare")}
        autoComplete="off"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

function TextBlock({ block }: Props<"text">) {
  return (
    <section className="px-1 py-1 text-center">
      {block.config.title ? <SectionTitle>{block.config.title}</SectionTitle> : null}
      {block.config.body ? (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--page-muted)]">
          {block.config.body}
        </p>
      ) : null}
    </section>
  );
}

function AnnouncementBlock({ block }: Props<"announcement">) {
  const { title, text, buttonLabel, url } = block.config;
  return (
    <section className="relative overflow-hidden rounded-[min(var(--page-radius),24px)] bg-[var(--accent-soft)] p-5 text-center text-[var(--accent-ink)]">
      <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-on)]">
        <Megaphone className="size-4" aria-hidden />
      </span>
      <h2 className="text-[17px] leading-snug font-semibold">{title}</h2>
      {text ? (
        <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap">{text}</p>
      ) : null}
      {url ? (
        <TrackedLink
          blockId={block.id}
          action="announcement"
          href={url}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-[var(--accent-on)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          {buttonLabel || linkLabel(url)}
          <ArrowUpRight className="size-4" aria-hidden />
        </TrackedLink>
      ) : null}
    </section>
  );
}

function StatsBlock({ block }: Props<"stats">) {
  const items = block.config.items;
  return (
    <dl
      className={cn(
        "page-card grid gap-2 text-center",
        items.length === 3 ? "grid-cols-3" : items.length === 2 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="flex flex-col-reverse px-1">
          <dt className="mt-1 text-[12.5px] leading-snug text-[var(--page-muted)]">{item.label}</dt>
          <dd className="text-[24px] leading-none font-semibold tracking-[-0.03em] text-[var(--accent-ink)] @sm:text-[28px]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PricingBlock({ block }: Props<"pricing">) {
  const headingId = useId();
  return (
    <section className="page-card" aria-labelledby={block.config.title ? headingId : undefined}>
      {block.config.title ? <SectionTitle id={headingId}>{block.config.title}</SectionTitle> : null}
      <ul className="divide-y divide-[var(--page-border)]">
        {block.config.items.map((item, index) => (
          <li key={index} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{item.label}</span>
              {item.note ? (
                <span className="block text-[12.5px] text-[var(--page-muted)]">{item.note}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-[15px] font-semibold text-[var(--accent-ink)] tabular-nums">
              {item.price}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FaqBlock({ block }: Props<"faq">) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <section className="page-card">
      {block.config.title ? <SectionTitle>{block.config.title}</SectionTitle> : null}
      <div className="divide-y divide-[var(--page-border)]">
        {block.config.items.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={index}>
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${base}-${index}`}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left text-[15px] font-medium"
                >
                  {item.question}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 text-[var(--page-muted)] transition-transform duration-300",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    id={`${base}-${index}`}
                    role="region"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-3.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-[var(--page-muted)]">
                      {item.answer}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const t = useTranslations("publicProfile.page");
  return (
    <span
      className="flex gap-0.5 text-[var(--accent)]"
      role="img"
      aria-label={t("stars", { count: rating })}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden
          className={cn("size-3.5", index < rating ? "fill-current" : "opacity-30")}
        />
      ))}
    </span>
  );
}

function ReviewsBlock({ block }: Props<"reviews">) {
  const t = useTranslations("publicProfile.page");
  const { items, layout } = block.config;
  const card = (item: (typeof items)[number], index: number) => (
    <figure
      key={index}
      className={cn(
        "page-card flex flex-col gap-2",
        layout === "carousel" && items.length > 1 && "w-[82%] shrink-0 snap-center",
      )}
    >
      <Stars rating={item.rating} />
      <blockquote className="text-[14.5px] leading-relaxed whitespace-pre-wrap">
        « {item.text} »
      </blockquote>
      <figcaption className="mt-auto text-[13px] font-semibold text-[var(--page-muted)]">
        {item.name}
      </figcaption>
    </figure>
  );

  return (
    <section aria-label={t("reviews")}>
      {layout === "carousel" && items.length > 1 ? (
        <div
          tabIndex={0}
          aria-label={t("reviews")}
          className="-mx-5 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth px-5 pb-2"
        >
          {items.map(card)}
        </div>
      ) : (
        <div className="space-y-3">{items.map(card)}</div>
      )}
    </section>
  );
}

/**
 * The week, Monday first, today in bold, and whether it is open right now.
 * "Now" is the visitor's clock read against the coach's timezone, and only
 * after mount: the server's idea of now would be stale in a cached page and
 * would not match the browser's at hydration.
 */
function HoursBlock({ block, context }: Props<"hours">) {
  const t = useTranslations("publicProfile.page");
  const locale = useLocale();
  const [status, setStatus] = useState<OpenStatus | null>(null);
  const [today, setToday] = useState<number | null>(null);
  const timezone = context.profile.timezone;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setStatus(openStatus(block.config.days, timezone, now));
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
      }).format(now);
      setToday(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday));
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [block.config.days, timezone]);

  const dayName = (weekday: number, width: "long" | "short" = "long") =>
    new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 7 + weekday)),
    );

  return (
    <section className="page-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-[var(--page-muted)]" aria-hidden />
            {t("hours")}
          </span>
        </SectionTitle>
        {status ? (
          <span
            className={cn(
              "-mt-3 rounded-full px-2.5 py-1 text-[12px] font-semibold",
              status.state === "open"
                ? "bg-[var(--accent)] text-[var(--accent-on)]"
                : "bg-[color-mix(in_oklab,var(--page-text)_9%,transparent)] text-[var(--page-muted)]",
            )}
          >
            {status.state === "open" ? t("openNow", { time: status.until }) : t("closedNow")}
          </span>
        ) : null}
      </div>
      <dl className="space-y-1.5 text-[14px]">
        {WEEK_ORDER.map((weekday) => {
          const day = block.config.days[weekday];
          return (
            <div
              key={weekday}
              className={cn(
                "flex justify-between gap-4",
                today === weekday ? "font-semibold" : "text-[var(--page-muted)]",
              )}
            >
              <dt className="capitalize">{dayName(weekday)}</dt>
              <dd className="tabular-nums">
                {day.closed ? t("closed") : `${day.open} – ${day.close}`}
              </dd>
            </div>
          );
        })}
      </dl>
      {status?.state === "closed" && status.next ? (
        <p className="mt-3 text-[12.5px] text-[var(--page-muted)]">
          {t("opensAt", { day: dayName(status.next.weekday), time: status.next.time })}
        </p>
      ) : null}
      {block.config.note ? (
        <p className="mt-3 text-[12.5px] text-[var(--page-muted)]">{block.config.note}</p>
      ) : null}
    </section>
  );
}
