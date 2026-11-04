import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { supportWhatsapp } from "@/lib/env";

/**
 * A round help button in the corner of the landing: a plain link to a
 * WhatsApp conversation with support. No chat script, no third-party
 * widget, nothing loaded until it is tapped — and no button at all while
 * SUPPORT_WHATSAPP is not set.
 */
export async function SupportBubble() {
  const number = supportWhatsapp();
  if (!number) return null;
  const t = await getTranslations("landing.support");

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(t("message"))}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("label")}
      title={t("label")}
      className="rise-in bg-ink text-ink-inverse fixed right-4 bottom-4 z-40 flex size-13 items-center justify-center rounded-full shadow-[var(--shadow-pop)] transition-transform duration-200 hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
      style={{ "--rise-delay": "0.8s" } as React.CSSProperties}
    >
      <MessageCircle className="size-5.5" aria-hidden />
    </a>
  );
}
