import {
  CreditCard,
  FileText,
  Globe,
  MousePointerClick,
  QrCode,
  Search,
  Store,
  Tag,
  type LucideProps,
} from "lucide-react";

import { PlatformIcon } from "@/components/page/platform-icon";
import type { SourceKind } from "@/lib/tracking/sources";

const PLATFORMS = new Set([
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "whatsapp",
  "snapchat",
]);

/**
 * The pictogram of a source: the platform's own for the known ones, a
 * printed-matter glyph for the coach's QR sources, a neutral one otherwise.
 */
export function SourceIcon({
  source,
  kind,
  ...props
}: LucideProps & { source: string; kind?: SourceKind | null }) {
  const key = kind && kind !== "autre" ? kind : source;
  if (PLATFORMS.has(key)) return <PlatformIcon platform={key as "instagram"} {...props} />;
  switch (key) {
    case "google":
      return <Search aria-hidden {...props} />;
    case "web":
      return <Globe aria-hidden {...props} />;
    case "direct":
      return <MousePointerClick aria-hidden {...props} />;
    case "flyer":
      return <FileText aria-hidden {...props} />;
    case "carte":
      return <CreditCard aria-hidden {...props} />;
    case "vitrine":
      return <Store aria-hidden {...props} />;
    default:
      return source.startsWith("qr-") ? (
        <QrCode aria-hidden {...props} />
      ) : (
        <Tag aria-hidden {...props} />
      );
  }
}

/** Brand names stay as they are; the rest is translated by the caller. */
export const SOURCE_BRANDS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  google: "Google",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  x: "X",
  snapchat: "Snapchat",
};
