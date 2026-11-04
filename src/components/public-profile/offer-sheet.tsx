"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { useTrack } from "@/components/page/tracking";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlays";
import { parseActionConfig } from "@/lib/offers/schema";
import { whatsappUrl } from "@/lib/page/urls";

import { OfferPrice } from "./offer-card";
import { OfferDetails } from "./offer-details";
import { OfferGallery } from "./offer-gallery";
import { RequestForm } from "./request-form";
import type { PublicOffer, PublicProfile } from "./types";

/**
 * An offer, opened from its service block: what it is, and the way to act on
 * it — the message or quote form, or the WhatsApp button.
 *
 * The sheet sits outside the themed page (it is a dialog on the document), so
 * it keeps the product's light surface and only borrows the coach's accent,
 * passed in already made readable on white.
 */
export function OfferSheet({
  offer,
  profile,
  accentStyle,
  blockId,
  onClose,
}: {
  offer: PublicOffer | null;
  profile: PublicProfile;
  accentStyle: CSSProperties;
  /** The service block it was opened from; contacts made here count for it. */
  blockId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("publicProfile");
  const track = useTrack();
  const tActions = useTranslations("offers.actions");

  if (!offer) return null;

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
      <div style={accentStyle} className="space-y-6">
        <OfferGallery offer={offer} />

        <OfferPrice
          offer={offer}
          currency={profile.currency}
          locale={profile.locale}
          className="text-[20px]"
        />

        {offer.description ? (
          <p className="text-ink-muted text-[15px] leading-relaxed whitespace-pre-wrap">
            {offer.description}
          </p>
        ) : null}

        <OfferDetails fields={offer.custom_fields} />

        <div className="border-line border-t pt-6">
          {offer.action_type === "whatsapp_direct" ? (
            whatsappNumber ? (
              <Button asChild variant="accent" size="lg" block>
                <a
                  href={whatsappUrl(whatsappNumber, whatsappConfig?.prefilled_message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("contact", blockId, "whatsapp")}
                >
                  <MessageCircle className="size-4" />
                  {whatsappConfig?.cta_label || t("cta.whatsapp_direct")}
                </a>
              </Button>
            ) : (
              <p className="text-ink-muted text-center text-[14px]">{t("whatsappUnavailable")}</p>
            )
          ) : (
            <RequestForm offer={offer} profile={profile} blockId={blockId} />
          )}
        </div>
      </div>
    </Sheet>
  );
}
