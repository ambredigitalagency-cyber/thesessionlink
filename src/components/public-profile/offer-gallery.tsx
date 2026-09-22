"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { galleryPhotos } from "@/lib/offers/fields";
import { cn } from "@/lib/utils";

import type { PublicOffer } from "./types";

/**
 * Photos inside the offer sheet: the main one stays the hero (same framing as
 * before), the rest become a strip of thumbnails underneath. With a single
 * photo this renders exactly what the sheet used to. Photos from the offer's
 * photo fields follow the offer's own photos, captioned with the field's name.
 */
export function OfferGallery({ offer }: { offer: PublicOffer }) {
  const t = useTranslations("publicProfile");

  // Older offers only have main_photo_url; treat it as a one-photo gallery.
  const photos = galleryPhotos(
    offer.photos.length > 0 ? offer.photos : offer.main_photo_url ? [offer.main_photo_url] : [],
    offer.custom_fields,
  );

  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;

  const current = photos[Math.min(index, photos.length - 1)];

  function step(delta: number) {
    setIndex((value) => (value + delta + photos.length) % photos.length);
  }

  return (
    <div className="space-y-2">
      <figure className="space-y-1.5">
        <div className="bg-ink/5 relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-md)]">
          <Image
            src={current.url}
            alt={current.caption ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover"
          />

          {photos.length > 1 ? (
            <>
              <GalleryArrow side="left" label={t("gallery.previous")} onClick={() => step(-1)} />
              <GalleryArrow side="right" label={t("gallery.next")} onClick={() => step(1)} />
              <span className="bg-ink/70 absolute right-2.5 bottom-2.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {index + 1}/{photos.length}
              </span>
            </>
          ) : null}
        </div>
        {current.caption ? (
          <figcaption className="text-ink-muted text-[13px]">{current.caption}</figcaption>
        ) : null}
      </figure>

      {photos.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2">
          {photos.map((photo, position) => (
            <li key={photo.url}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={t("gallery.show", { index: position + 1 })}
                aria-current={position === index}
                className={cn(
                  "bg-ink/5 relative block aspect-square w-full overflow-hidden rounded-[var(--radius-xs)] ring-offset-2 transition-all",
                  position === index ? "ring-ink ring-2" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GalleryArrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "bg-ink/60 hover:bg-ink absolute top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white backdrop-blur transition-colors",
        side === "left" ? "left-2.5" : "right-2.5",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
